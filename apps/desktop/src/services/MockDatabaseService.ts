import type { AsyncDatabaseAdapter } from '@diary-quest/database';

/**
 * Mock Database Service for Web Environment
 * Uses localStorage to simulate a database
 */
export class MockDatabaseService implements AsyncDatabaseAdapter {
    private initialized = false;
    private storagePrefix = 'dq_db_';

    async initialize(): Promise<void> {
        this.initialized = true;
        console.log('Mock Database initialized (Web Mode)');

        // Initialize default world if not exists
        const worlds = this.getTableData('worlds');
        if (worlds.length === 0) {
            this.execute(`
        INSERT INTO worlds (id, created_at, updated_at, name, description, genre, setting, tone, rules)
        VALUES (
          'world_temp',
          '${new Date().toISOString()}',
          '${new Date().toISOString()}',
          'デフォルトワールド',
          '剣と魔法のファンタジー世界',
          'fantasy',
          '中世ファンタジー',
          'epic',
          '{"magic": true, "level_system": true}'
        )
      `);
        }
    }

    async close(): Promise<void> {
        this.initialized = false;
    }

    async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
        if (!this.initialized) await this.initialize();

        const normalizedSql = sql.trim();

        // Handle SELECT
        if (/^SELECT/i.test(normalizedSql)) {
            return this.handleSelect<T>(normalizedSql, params);
        }

        return [] as T[];
    }

    async execute(sql: string, params: unknown[] = []): Promise<number> {
        if (!this.initialized) await this.initialize();

        const normalizedSql = sql.trim();

        // Handle INSERT
        if (/^INSERT/i.test(normalizedSql)) {
            return this.handleInsert(normalizedSql, params);
        }

        // Handle UPDATE
        if (/^UPDATE/i.test(normalizedSql)) {
            return this.handleUpdate(normalizedSql, params);
        }

        // Handle DELETE
        if (/^DELETE/i.test(normalizedSql)) {
            return this.handleDelete(normalizedSql, params);
        }

        return 0;
    }

    async queryOne<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
        const results = await this.query<T>(sql, params);
        return results.length > 0 ? results[0] : null;
    }

    async beginTransaction(): Promise<void> { }
    async commit(): Promise<void> { }
    async rollback(): Promise<void> { }

    async transaction<T>(fn: () => Promise<T>): Promise<T> {
        return fn();
    }

    async tableExists(tableName: string): Promise<boolean> {
        return localStorage.getItem(this.storagePrefix + tableName) !== null;
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    getPath(): string | null {
        return 'local-storage';
    }

    // --- Private Helper Methods ---

    private getTableData(tableName: string): any[] {
        try {
            const data = localStorage.getItem(this.storagePrefix + tableName);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`Failed to load table data for ${tableName}:`, error);
            return [];
        }
    }

    private saveTableData(tableName: string, data: any[]): void {
        try {
            localStorage.setItem(this.storagePrefix + tableName, JSON.stringify(data));
        } catch (error) {
            console.error(`Failed to save table data for ${tableName}:`, error);
        }
    }

    private extractTableName(sql: string): string | null {
        const match = sql.match(/(?:FROM|INTO|UPDATE|TABLE)\s+([a-zA-Z0-9_]+)/i);
        return match ? match[1] : null;
    }

    /**
     * Split string by comma, ignoring commas inside quotes, parentheses, and braces
     */
    private splitByComma(str: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuote = false;
        let quoteChar = '';
        let bracketDepth = 0; // {}, [], ()

        for (let i = 0; i < str.length; i++) {
            const char = str[i];

            if (inQuote) {
                current += char;
                if (char === quoteChar && str[i - 1] !== '\\') {
                    inQuote = false;
                }
            } else {
                if (char === "'" || char === '"') {
                    inQuote = true;
                    quoteChar = char;
                    current += char;
                } else if (char === '{' || char === '[' || char === '(') {
                    bracketDepth++;
                    current += char;
                } else if (char === '}' || char === ']' || char === ')') {
                    bracketDepth--;
                    current += char;
                } else if (char === ',' && bracketDepth === 0) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
        }
        if (current) result.push(current.trim());
        return result;
    }

    private handleSelect<T>(sql: string, params: unknown[]): T[] {
        const tableName = this.extractTableName(sql);
        if (!tableName) return [];

        let data = this.getTableData(tableName);

        // Handle COUNT(*)
        if (/SELECT\s+COUNT\(\*\)/i.test(sql)) {
            const whereClause = sql.match(/WHERE\s+([\s\S]+?)(?:ORDER|LIMIT|$)/i);
            if (whereClause) {
                data = this.filterData(data, whereClause[1], params);
            }
            return [{ count: data.length }] as unknown as T[];
        }

        // Handle WHERE
        const whereClause = sql.match(/WHERE\s+([\s\S]+?)(?:ORDER|LIMIT|$)/i);
        if (whereClause) {
            data = this.filterData(data, whereClause[1], params);
        }

        // Handle ORDER BY
        const orderClause = sql.match(/ORDER\s+BY\s+([a-zA-Z0-9_]+)(?:\s+(ASC|DESC))?/i);
        if (orderClause) {
            const col = orderClause[1];
            const desc = orderClause[2]?.toUpperCase() === 'DESC';
            data.sort((a, b) => {
                if (a[col] < b[col]) return desc ? 1 : -1;
                if (a[col] > b[col]) return desc ? -1 : 1;
                return 0;
            });
        }

        // Handle LIMIT
        const limitClause = sql.match(/LIMIT\s+(\d+)/i);
        if (limitClause) {
            const limit = parseInt(limitClause[1], 10);
            data = data.slice(0, limit);
        }

        return data as T[];
    }

    private handleInsert(sql: string, params: unknown[]): number {
        const tableName = this.extractTableName(sql);
        if (!tableName) return 0;

        const colsMatch = sql.match(/\(([\s\S]+?)\)\s+VALUES/i);
        if (!colsMatch) return 0;
        const cols = this.splitByComma(colsMatch[1]);

        const row: Record<string, any> = {};

        if (params.length > 0) {
            cols.forEach((col, i) => {
                row[col] = params[i];
            });
        } else {
            const valuesMatch = sql.match(/VALUES\s+\(([\s\S]+?)\)/i);
            if (valuesMatch) {
                const values = this.splitByComma(valuesMatch[1]).map(v => {
                    const val = v.trim();
                    if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
                    if (val === 'true') return true;
                    if (val === 'false') return false;
                    if (val === 'NULL') return null;
                    return Number(val) || val;
                });
                cols.forEach((col, i) => {
                    row[col] = values[i];
                });
            }
        }

        const data = this.getTableData(tableName);
        data.push(row);
        this.saveTableData(tableName, data);

        return 1;
    }

    private handleUpdate(sql: string, params: unknown[]): number {
        const tableName = this.extractTableName(sql);
        if (!tableName) return 0;

        const data = this.getTableData(tableName);
        let updatedCount = 0;

        const setMatch = sql.match(/SET\s+([\s\S]+?)\s+WHERE/i);
        if (!setMatch) return 0;

        const whereClauseMatch = sql.match(/WHERE\s+([\s\S]+?)(?:$|;)/i);
        if (!whereClauseMatch) return 0;
        const whereClause = whereClauseMatch[1];

        const setClause = setMatch[1];
        // Count ? only outside of quotes/brackets to be safe, though usually ? is not inside strings
        // Simple count is fine for ? as param placeholder
        const setParamCount = (setClause.match(/\?/g) || []).length;

        const setParams = params.slice(0, setParamCount);
        const whereParams = params.slice(setParamCount);

        const assignments = this.splitByComma(setClause);

        const newData = data.map(row => {
            if (this.matchRow(row, whereClause, whereParams)) {
                updatedCount++;
                let paramIndex = 0;
                const newRow = { ...row };

                assignments.forEach(assignment => {
                    const parts = assignment.split('=');
                    const col = parts[0].trim();
                    const valExpr = parts.slice(1).join('=').trim(); // Handle case where value contains =

                    if (valExpr === '?') {
                        newRow[col] = setParams[paramIndex++];
                    } else {
                        if (valExpr.startsWith("'") && valExpr.endsWith("'")) newRow[col] = valExpr.slice(1, -1);
                        else if (valExpr === 'true') newRow[col] = true;
                        else if (valExpr === 'false') newRow[col] = false;
                        else newRow[col] = Number(valExpr) || valExpr;
                    }
                });
                return newRow;
            }
            return row;
        });

        this.saveTableData(tableName, newData);
        return updatedCount;
    }

    private handleDelete(sql: string, params: unknown[]): number {
        const tableName = this.extractTableName(sql);
        if (!tableName) return 0;

        const data = this.getTableData(tableName);
        const initialLength = data.length;

        const whereClause = sql.match(/WHERE\s+([\s\S]+?)(?:$|;)/i);
        let newData = data;

        if (whereClause) {
            newData = data.filter(row => !this.matchRow(row, whereClause[1], params));
        } else {
            newData = [];
        }

        this.saveTableData(tableName, newData);
        return initialLength - newData.length;
    }

    private filterData(data: any[], whereClause: string, params: unknown[]): any[] {
        return data.filter(row => this.matchRow(row, whereClause, params));
    }

    private matchRow(row: any, whereClause: string, params: unknown[]): boolean {
        const conditions = whereClause.split(/\s+AND\s+/i);
        let paramIndex = 0;

        return conditions.every(condition => {
            const parts = condition.split(/\s*(=|!=|>|<|>=|<=|IS)\s*/);
            if (parts.length < 3) return true;

            const col = parts[0].trim();
            const op = parts[1].trim();
            const val = parts[2].trim();

            let compareVal: any;
            if (val === '?') {
                compareVal = params[paramIndex++];
            } else {
                if (val.startsWith("'") && val.endsWith("'")) compareVal = val.slice(1, -1);
                else if (val === 'true') compareVal = true;
                else if (val === 'false') compareVal = false;
                else if (val === 'NULL') compareVal = null;
                else compareVal = Number(val) || val;
            }

            const rowVal = row[col];

            switch (op) {
                case '=': return rowVal == compareVal;
                case '!=': return rowVal != compareVal;
                case '>': return rowVal > compareVal;
                case '<': return rowVal < compareVal;
                case '>=': return rowVal >= compareVal;
                case '<=': return rowVal <= compareVal;
                case 'IS': return rowVal === compareVal;
                default: return false;
            }
        });
    }
}

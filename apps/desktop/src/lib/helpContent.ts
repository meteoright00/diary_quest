export interface HelpContent {
    title: string;
    description: string;
}

export const helpContent: Record<string, HelpContent> = {
    home: {
        title: '冒険の拠点',
        description: '現在のレベル、経験値、所持金（ゴールド）を一目で確認できます。サイドバーからすべての冒険（ページ）へ旅立つことができます。'
    },
    diary: {
        title: '冒険の記録',
        description: 'その日の出来事を書き記す場所です。「記録を完了」を押すと、AIがあなたの日常をファンタジー世界の冒険譚へと変換します。感情分析も同時に行われます。'
    },
    pastDiaries: {
        title: '過去の足跡',
        description: 'これまでの日記と冒険ログを一覧で振り返ることができます。'
    },
    character: {
        title: '冒険者の証',
        description: 'ステータス、装備、および固有名称マッピング（現実の名称をファンタジー用語に変換する設定）の確認や変更ができます。日記の内容に応じてパラメータが成長します。'
    },
    quests: {
        title: '依頼板',
        description: '現実世界のタスクを「クエスト」として管理します。チェックリスト形式で進捗を管理し、完了すると報酬が得られます。'
    },
    story: {
        title: '英雄の叙事詩',
        description: '日々の冒険ログが繋ぎ合わされ、ひとつの物語として生成されます。あなたの歩みが壮大なストーリーとなります。'
    },
    reports: {
        title: '成長の記録',
        description: '週ごと・月ごとの活動量や感情の推移をグラフで確認できます。AIによるフィードバックコメントも参照できます。'
    },
    settings: {
        title: '冒険の準備',
        description: 'AIプロバイダー(Gemini等)のAPIキー設定や、ワールド設定(世界観)の変更などが可能です。'
    },
    welcome: {
        title: '旅立ちの前に',
        description: 'アプリの初期セットアップウィザードです。'
    }
};

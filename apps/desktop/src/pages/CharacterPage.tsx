import { useState, useEffect, useMemo } from 'react';
import { useCharacterStore } from '@/store/characterStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useWorldStore } from '@/store/worldStore';
import { CharacterManager, ExpCalculator } from '@diary-quest/core/character';
import { OpenAIProvider, ClaudeProvider, GeminiProvider } from '@diary-quest/core/llm';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { CharacterClass, NameMapping } from '@diary-quest/core/types';
import { confirm } from '@/lib/tauri';
import { generateId } from '@diary-quest/shared';

type Page = 'welcome' | 'settings';

interface CharacterPageProps {
  onNavigate?: (page: Page) => void;
}

export default function CharacterPage({ onNavigate }: CharacterPageProps = {}) {
  const { currentCharacter, characters, isLoading, loadCharacters, createCharacter, setCurrentCharacter, saveCharacter } = useCharacterStore();
  const { worldSettings, llmSettings, getLLMProviderConfig } = useSettingsStore();
  const { currentWorld, initializeWorld } = useWorldStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCustomClassModal, setShowCustomClassModal] = useState(false);
  const [customClasses, setCustomClasses] = useState<CharacterClass[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingCustomClassId, setEditingCustomClassId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    class: '',
    classId: '',
  });
  const [customClassForm, setCustomClassForm] = useState({
    name: '',
    description: '',
    icon: '✨',
    specialties: ['', '', ''],
  });

  // Name mapping management
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [editingMappingForm, setEditingMappingForm] = useState({
    realWorld: '',
    fantasyWorld: '',
    category: 'location' as NameMapping['category'],
  });
  const [showAddMappingForm, setShowAddMappingForm] = useState(false);
  const [mappingFilter, setMappingFilter] = useState<'all' | 'pending' | 'confirmed'>('all');

  // Check if AI features can be used
  const canUseAI = useMemo(() => {
    // LLM APIキーが設定されているか
    const hasAPIKey = llmSettings?.apiKey !== '' && llmSettings?.apiKey != null;
    // 世界観が選択されているか
    const hasWorld = worldSettings !== null;

    return hasAPIKey && hasWorld;
  }, [llmSettings?.apiKey, worldSettings]);

  // Get available classes from world settings with fallback, plus custom classes
  const availableClasses = useMemo((): CharacterClass[] => {
    const defaultClasses = worldSettings?.availableClasses && worldSettings.availableClasses.length > 0
      ? worldSettings.availableClasses
      : [
        {
          id: 'adventurer',
          name: worldSettings?.protagonist.occupation || '冒険者',
          description: '様々な技能を持つ万能タイプ',
          icon: '🎒',
          specialties: worldSettings?.protagonist.specialties || [],
        },
      ];

    // Add custom classes
    return [...defaultClasses, ...customClasses];
  }, [worldSettings, customClasses]);

  // Load custom classes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('customClasses');
    if (saved) {
      try {
        setCustomClasses(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load custom classes:', e);
      }
    }
  }, []);

  // Load characters when page is opened
  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  // Set current character when characters are loaded
  useEffect(() => {
    if (characters.length > 0 && !currentCharacter) {
      setCurrentCharacter(characters[0]);
      setShowCreateForm(false);
    } else if (characters.length === 0 && !isLoading) {
      setShowCreateForm(true);
    }
  }, [characters, currentCharacter, isLoading, setCurrentCharacter]);

  // Set default class when available classes change
  useEffect(() => {
    if (availableClasses.length > 0 && !formData.classId) {
      const defaultClass = availableClasses[0];
      setFormData(prev => ({
        ...prev,
        class: defaultClass.name,
        classId: defaultClass.id,
      }));
    }
  }, [availableClasses]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClassSelect = (selectedClass: CharacterClass) => {
    setFormData(prev => ({
      ...prev,
      class: selectedClass.name,
      classId: selectedClass.id,
    }));
  };

  const handleCustomClassInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomClassForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSpecialtyChange = (index: number, value: string) => {
    setCustomClassForm(prev => {
      const newSpecialties = [...prev.specialties];
      newSpecialties[index] = value;
      return { ...prev, specialties: newSpecialties };
    });
  };

  const handleGenerateWithAI = async () => {
    if (!customClassForm.name) {
      alert('クラス名を入力してください');
      return;
    }

    setIsGenerating(true);

    try {
      const providerConfig = getLLMProviderConfig();

      // Create LLM provider instance
      let llm;
      switch (providerConfig.id) {
        case 'openai':
          llm = new OpenAIProvider(providerConfig);
          break;
        case 'claude':
          llm = new ClaudeProvider(providerConfig);
          break;
        case 'gemini':
          llm = new GeminiProvider(providerConfig);
          break;
        default:
          throw new Error(`Unknown provider: ${providerConfig.id}`);
      }

      const worldName = worldSettings?.worldInfo.name || '未知の世界';
      const worldEra = worldSettings?.worldInfo.era || '時代不明';
      const worldCharacteristics = worldSettings?.worldInfo.characteristics || '特徴なし';

      const prompt = `あなたは「${worldName}」という世界観のキャラクタークラス設定を作成するアシスタントです。

世界観情報:
- 時代: ${worldEra}
- 特徴: ${worldCharacteristics}

ユーザーが作成したいクラス名: ${customClassForm.name}

この世界観に合った「${customClassForm.name}」クラスの設定を以下のJSON形式で生成してください：

{
  "description": "クラスの説明（1〜2文で簡潔に）",
  "specialties": ["特技1", "特技2", "特技3"]
}

注意:
- descriptionは40〜80文字程度
- specialtiesは3つ、各2〜6文字程度
- 世界観に合った内容にすること
- JSON形式のみを返すこと（説明文は不要）`;

      const response = await llm.generateText(prompt, {
        temperature: 0.8,
        maxTokens: 1024,
      });

      // JSONをパース
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSONの解析に失敗しました');
      }

      const generated = JSON.parse(jsonMatch[0]);

      // フォームに反映
      setCustomClassForm(prev => ({
        ...prev,
        description: generated.description || '',
        specialties: [
          generated.specialties[0] || '',
          generated.specialties[1] || '',
          generated.specialties[2] || '',
        ],
      }));
    } catch (error) {
      console.error('AI生成エラー:', error);
      alert('AI生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditCustomClass = (customClass: CharacterClass) => {
    setEditingCustomClassId(customClass.id);
    setCustomClassForm({
      name: customClass.name,
      description: customClass.description,
      icon: customClass.icon || '✨',
      specialties: [
        (customClass.specialties && customClass.specialties[0]) || '',
        (customClass.specialties && customClass.specialties[1]) || '',
        (customClass.specialties && customClass.specialties[2]) || '',
      ],
    });
    setShowCustomClassModal(true);
  };

  const handleDeleteCustomClass = async () => {
    const confirmed = await confirm('選択したキャラクターを削除してもよろしいですか？\nこの操作は取り消せません。', {
      title: '削除の確認',
      type: 'warning',
    });

    if (!confirmed) {
      return;
    }

    // Remove from state and localStorage
    setCustomClasses([]);
    localStorage.removeItem('customClasses');

    // If currently selected class is the custom class being deleted, reset to default
    if (customClasses.length > 0 && formData.classId === customClasses[0].id) {
      const defaultClass = availableClasses[0];
      if (defaultClass && !customClasses.includes(defaultClass)) {
        handleClassSelect(defaultClass);
      }
    }
  };

  const handleCreateCustomClass = () => {
    if (!customClassForm.name || !customClassForm.description) {
      alert('クラス名と説明を入力してください');
      return;
    }

    const filteredSpecialties = customClassForm.specialties.filter(s => s.trim() !== '');
    if (filteredSpecialties.length === 0) {
      alert('少なくとも1つの特技を入力してください');
      return;
    }

    if (editingCustomClassId) {
      // Edit mode: Update existing class
      const updatedClass: CharacterClass = {
        id: editingCustomClassId,
        name: customClassForm.name,
        description: customClassForm.description,
        icon: customClassForm.icon,
        specialties: filteredSpecialties,
      };

      const updatedClasses = [updatedClass];
      setCustomClasses(updatedClasses);
      localStorage.setItem('customClasses', JSON.stringify(updatedClasses));

      // If this class is currently selected, update the selection
      if (formData.classId === editingCustomClassId) {
        handleClassSelect(updatedClass);
      }
    } else {
      // Create mode: Add new class
      const newClass: CharacterClass = {
        id: `custom_${Date.now()}`,
        name: customClassForm.name,
        description: customClassForm.description,
        icon: customClassForm.icon,
        specialties: filteredSpecialties,
      };

      const updatedClasses = [newClass];
      setCustomClasses(updatedClasses);
      localStorage.setItem('customClasses', JSON.stringify(updatedClasses));

      // Auto-select the newly created class
      handleClassSelect(newClass);
    }

    // Reset form and close modal
    setCustomClassForm({
      name: '',
      description: '',
      icon: '✨',
      specialties: ['', '', ''],
    });
    setEditingCustomClassId(null);
    setShowCustomClassModal(false);
  };

  const handleCreateCharacter = async () => {
    if (!formData.name) {
      alert('名前を入力してください');
      return;
    }

    try {
      // Ensure world exists in DB before creating character
      // If we came from WelcomePage, it should be initialized.
      // But if we reloaded, we might need to rely on what's in store or re-initialize.
      let targetWorldId = currentWorld?.id;

      if (!targetWorldId && worldSettings) {
        // Fallback: try to initialize/find world based on current settings
        // This handles page reload cases where worldStore might be empty but settings persist
        const world = await initializeWorld(worldSettings);
        targetWorldId = world.id;
      }

      if (!targetWorldId) {
        alert('世界観設定が見つかりません。設定画面またはトップページから世界観を選択してください。');
        return;
      }

      const manager = new CharacterManager();
      const character = manager.createCharacter({
        name: formData.name,
        characterClass: formData.class,
        worldId: targetWorldId,
      });

      await createCharacter(character);
      setCurrentCharacter(character);
      setShowCreateForm(false);
      alert('キャラクターを作成しました！');
    } catch (error) {
      console.error('Failed to create character:', error);
      alert('キャラクターの作成に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Name mapping handlers
  const handleConfirmMapping = async (mappingId: string) => {
    if (!currentCharacter) return;

    const mapping = currentCharacter.nameMappings.find((m) => m.id === mappingId);
    if (!mapping) return;

    mapping.status = 'confirmed';
    await saveCharacter(currentCharacter);
    // Force re-render by creating new object reference
    setCurrentCharacter({ ...currentCharacter });
  };

  const handleRejectMapping = async (mappingId: string) => {
    if (!currentCharacter) return;

    const mapping = currentCharacter.nameMappings.find((m) => m.id === mappingId);
    if (!mapping) return;

    mapping.status = 'rejected';
    await saveCharacter(currentCharacter);
    // Force re-render by creating new object reference
    setCurrentCharacter({ ...currentCharacter });
  };

  const handleEditMapping = (mapping: NameMapping) => {
    setEditingMappingId(mapping.id);
    setEditingMappingForm({
      realWorld: mapping.realWorld,
      fantasyWorld: mapping.fantasyWorld,
      category: mapping.category,
    });
  };

  const handleSaveMapping = async () => {
    if (!currentCharacter || !editingMappingId) return;

    const mapping = currentCharacter.nameMappings.find((m) => m.id === editingMappingId);
    if (!mapping) return;

    mapping.realWorld = editingMappingForm.realWorld;
    mapping.fantasyWorld = editingMappingForm.fantasyWorld;
    mapping.category = editingMappingForm.category;

    await saveCharacter(currentCharacter);
    setEditingMappingId(null);
    setEditingMappingForm({
      realWorld: '',
      fantasyWorld: '',
      category: 'location',
    });
    // Force re-render by creating new object reference
    setCurrentCharacter({ ...currentCharacter });
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!currentCharacter) return;

    console.log('[Debug] Requesting delete confirmation for', mappingId);
    const confirmed = await confirm('このマッピングを削除してもよろしいですか？', {
      title: '確認',
      type: 'warning',
    });
    console.log('[Debug] Confirmation result:', confirmed);

    if (!confirmed) return;

    const updatedMappings = currentCharacter.nameMappings.filter((m) => m.id !== mappingId);
    const updatedCharacter = { ...currentCharacter, nameMappings: updatedMappings };

    console.log('[Debug] Saving updated character with mappings count:', updatedMappings.length);
    await saveCharacter(updatedCharacter);
    console.log('[Debug] Character saved, setting current character');
    setCurrentCharacter(updatedCharacter);
  };

  const handleAddMapping = async () => {
    if (!currentCharacter) return;

    if (!editingMappingForm.realWorld || !editingMappingForm.fantasyWorld) {
      alert('現実世界の用語とファンタジー世界の用語を入力してください');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const newMapping: NameMapping = {
      id: generateId(),
      realWorld: editingMappingForm.realWorld,
      fantasyWorld: editingMappingForm.fantasyWorld,
      category: editingMappingForm.category,
      status: 'confirmed',
      frequency: 0,
      firstAppeared: today,
      lastUsed: today,
    };

    const updatedMappings = [...currentCharacter.nameMappings, newMapping];
    const updatedCharacter = { ...currentCharacter, nameMappings: updatedMappings };

    await saveCharacter(updatedCharacter);

    setEditingMappingForm({
      realWorld: '',
      fantasyWorld: '',
      category: 'location',
    });
    setShowAddMappingForm(false);
    setCurrentCharacter(updatedCharacter);
  };

  // Calculate EXP progression data for chart (must be called before any early return due to React Hooks rules)
  const expProgressData = useMemo(() => {
    if (!currentCharacter) return [];

    const expCalculator = new ExpCalculator();
    const currentLevel = currentCharacter.level.current;
    const startLevel = Math.max(1, currentLevel - 5);
    const endLevel = Math.min(100, currentLevel + 5);

    const data = [];
    for (let level = startLevel; level <= endLevel; level++) {
      data.push({
        level,
        exp: expCalculator.calculateExpForNextLevel(level),
        isCurrent: level === currentLevel
      });
    }
    return data;
  }, [currentCharacter?.level.current]);

  // Filter and organize name mappings
  const filteredMappings = useMemo(() => {
    if (!currentCharacter) return [];

    let mappings = currentCharacter.nameMappings.filter((m) => m.status !== 'rejected');

    if (mappingFilter === 'pending') {
      mappings = mappings.filter((m) => m.status === 'pending');
    } else if (mappingFilter === 'confirmed') {
      mappings = mappings.filter((m) => m.status === 'confirmed');
    }

    // Sort by category, then by lastUsed date (newest first)
    return mappings.sort((a, b) => {
      if (a.category !== b.category) {
        const order = ['location', 'person', 'organization', 'item'];
        return order.indexOf(a.category) - order.indexOf(b.category);
      }
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    });
  }, [currentCharacter?.nameMappings, mappingFilter]);

  const mappingStats = useMemo(() => {
    if (!currentCharacter) return { total: 0, pending: 0, confirmed: 0 };

    const active = currentCharacter.nameMappings.filter((m) => m.status !== 'rejected');
    return {
      total: active.length,
      pending: active.filter((m) => m.status === 'pending').length,
      confirmed: active.filter((m) => m.status === 'confirmed').length,
    };
  }, [currentCharacter?.nameMappings]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">キャラクター</h2>
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  if (showCreateForm || !currentCharacter) {
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">キャラクター作成</h2>

        <div className="bg-gray-800 rounded-lg p-6">
          <p className="text-gray-300 mb-6">
            冒険を始めるために、あなたのキャラクターを作成しましょう！
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                キャラクター名
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="あなたの名前を入力..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3">
                クラスを選択
              </label>
              <div className="grid grid-cols-2 gap-3">
                {availableClasses.slice(0, 3).map((classOption) => (
                  <button
                    key={classOption.id}
                    type="button"
                    onClick={() => handleClassSelect(classOption)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${formData.classId === classOption.id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{classOption.icon || '⚔️'}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white mb-1">{classOption.name}</h4>
                        <p className="text-xs text-gray-400 line-clamp-2">
                          {classOption.description}
                        </p>
                        {classOption.specialties && classOption.specialties.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {classOption.specialties.slice(0, 2).map((specialty, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-0.5 bg-gray-600 rounded-full text-gray-300"
                              >
                                {specialty}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}

                {/* Custom class slot */}
                {customClasses.length > 0 ? (
                  <div
                    key={customClasses[0].id}
                    className={`p-4 rounded-lg border-2 transition-all relative ${formData.classId === customClasses[0].id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-gray-600 bg-gray-700'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleClassSelect(customClasses[0])}
                      className="w-full text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{customClasses[0].icon || '✨'}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white mb-1">
                            {customClasses[0].name}
                            <span className="ml-2 text-xs text-amber-400">オリジナル</span>
                          </h4>
                          <p className="text-xs text-gray-400 line-clamp-2">
                            {customClasses[0].description}
                          </p>
                          {customClasses[0].specialties && customClasses[0].specialties.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {customClasses[0].specialties.slice(0, 2).map((specialty, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-0.5 bg-gray-600 rounded-full text-gray-300"
                                >
                                  {specialty}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                    {/* Edit and Delete buttons */}
                    <div className="mt-3 pt-3 border-t border-gray-600 flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCustomClass(customClasses[0]);
                        }}
                        className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-colors"
                      >
                        ✏️ 編集
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomClass();
                        }}
                        className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors"
                      >
                        🗑️ 削除
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCustomClassId(null);
                      setShowCustomClassModal(true);
                    }}
                    className="p-4 rounded-lg border-2 border-dashed border-gray-600 bg-gray-800 hover:border-amber-500 hover:bg-gray-700 transition-all"
                  >
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <div className="text-4xl">➕</div>
                      <div className="text-sm font-bold text-gray-300">オリジナルクラス</div>
                      <div className="text-xs text-gray-500">作成する</div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handleCreateCharacter}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              ⚔️ 冒険を始める
            </button>
          </div>
        </div>

        {/* Custom Class Creation/Edit Modal */}
        {showCustomClassModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => {
            setShowCustomClassModal(false);
            setEditingCustomClassId(null);
          }}>
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold mb-4">
                {editingCustomClassId ? 'オリジナルクラスを編集' : 'オリジナルクラスを作成'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    クラス名
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={customClassForm.name}
                    onChange={handleCustomClassInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="例: 剣聖、錬金術師、暗殺者..."
                  />
                </div>

                {/* AI生成ボタン - 条件付きUI */}
                {canUseAI ? (
                  <button
                    type="button"
                    onClick={handleGenerateWithAI}
                    disabled={!customClassForm.name || isGenerating}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        生成中...
                      </>
                    ) : (
                      <>
                        <span>✨</span>
                        AIで説明と特技を生成
                      </>
                    )}
                  </button>
                ) : (
                  <div className="text-sm text-gray-400 p-4 border border-gray-600 rounded-lg bg-gray-700/50">
                    <p className="font-semibold mb-3 text-gray-300">💡 AI生成を使用するには以下の設定が必要です：</p>
                    <ul className="space-y-2">
                      {!llmSettings?.apiKey && (
                        <li className="flex items-center gap-2">
                          <span className="text-amber-400">→</span>
                          {onNavigate ? (
                            <button
                              type="button"
                              onClick={() => onNavigate('settings')}
                              className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                            >
                              LLM APIキーを設定
                            </button>
                          ) : (
                            <span className="text-gray-300">設定ページでLLM APIキーを設定してください</span>
                          )}
                        </li>
                      )}
                      {!worldSettings && (
                        <li className="flex items-center gap-2">
                          <span className="text-amber-400">→</span>
                          {onNavigate ? (
                            <button
                              type="button"
                              onClick={() => onNavigate('welcome')}
                              className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                            >
                              世界観を選択
                            </button>
                          ) : (
                            <span className="text-gray-300">ようこそページで世界観を選択してください</span>
                          )}
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    説明
                  </label>
                  <textarea
                    name="description"
                    value={customClassForm.description}
                    onChange={handleCustomClassInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    rows={3}
                    placeholder="このクラスの特徴や能力を説明..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    アイコン（絵文字）
                  </label>
                  <input
                    type="text"
                    name="icon"
                    value={customClassForm.icon}
                    onChange={handleCustomClassInputChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="✨"
                    maxLength={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    特技（最大3つ）
                  </label>
                  <div className="space-y-2">
                    {customClassForm.specialties.map((specialty, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={specialty}
                        onChange={(e) => handleSpecialtyChange(idx, e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder={`特技 ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCustomClassModal(false);
                      setEditingCustomClassId(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleCreateCustomClass}
                    className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors"
                  >
                    {editingCustomClassId ? '保存' : '作成'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const character = currentCharacter;
  const hpPercent = (character.stats.hp.current / character.stats.hp.max) * 100;
  const mpPercent = (character.stats.mp.current / character.stats.mp.max) * 100;
  const staminaPercent = (character.stats.stamina.current / character.stats.stamina.max) * 100;
  const expPercent = (character.level.exp / character.level.expToNextLevel) * 100;

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">キャラクター</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">基本情報</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">名前</span>
              <span className="font-bold">{character.basicInfo.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">クラス</span>
              <span className="font-bold">{character.basicInfo.class}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">称号</span>
              <span className="font-bold">{character.basicInfo.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">ギルド</span>
              <span className="font-bold">{character.basicInfo.guild}</span>
            </div>
          </div>
        </div>

        {/* Level & Experience */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">レベル</h3>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-amber-500">{character.level.current}</div>
              <div className="text-sm text-gray-400 mt-1">レベル</div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span className="text-gray-400">経験値</span>
                <span className="font-bold text-amber-400">
                  {character.level.exp} / {character.level.expToNextLevel}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-amber-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${expPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">ステータス</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">HP</span>
                <span className="font-bold text-red-400">
                  {character.stats.hp.current} / {character.stats.hp.max}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${hpPercent}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">MP</span>
                <span className="font-bold text-blue-400">
                  {character.stats.mp.current} / {character.stats.mp.max}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${mpPercent}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">スタミナ</span>
                <span className="font-bold text-orange-400">
                  {character.stats.stamina.current} / {character.stats.stamina.max}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${staminaPercent}%` }}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <div className="text-gray-400 text-sm">攻撃力</div>
                <div className="font-bold text-lg text-red-400">{character.stats.attack}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">防御力</div>
                <div className="font-bold text-lg text-blue-400">{character.stats.defense}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">魔力</div>
                <div className="font-bold text-lg text-purple-400">{character.stats.magic}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">魔法防御</div>
                <div className="font-bold text-lg text-indigo-400">{character.stats.magicDefense}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">素早さ</div>
                <div className="font-bold text-lg text-green-400">{character.stats.agility}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">運</div>
                <div className="font-bold text-lg text-yellow-400">{character.stats.luck}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Currency */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">所持金</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <span className="text-2xl">💰</span>
              <div className="text-right">
                <div className="font-bold text-xl text-amber-400">{character.currency.gold}</div>
                <div className="text-sm text-gray-400">ゴールド</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <span className="text-2xl">🪙</span>
              <div className="text-right">
                <div className="font-bold text-xl text-gray-300">{character.currency.silver}</div>
                <div className="text-sm text-gray-400">シルバー</div>
              </div>
            </div>
          </div>
        </div>

        {/* Equipment */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">装備</h3>
          <div className="space-y-3">
            {/* Weapon */}
            <div className="p-3 bg-gray-700 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{character.equipment.weapon?.icon || '🗡️'}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-bold">
                      {character.equipment.weapon?.name || 'なし'}
                    </div>
                    {character.equipment.weapon && (
                      <span className={`text-xs px-2 py-0.5 rounded ${character.equipment.weapon.rarity === 'legendary' ? 'bg-amber-500/20 text-amber-400' :
                        character.equipment.weapon.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                          character.equipment.weapon.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
                            character.equipment.weapon.rarity === 'uncommon' ? 'bg-green-500/20 text-green-400' :
                              'bg-gray-500/20 text-gray-400'
                        }`}>
                        {character.equipment.weapon.rarity === 'legendary' ? 'レジェンダリー' :
                          character.equipment.weapon.rarity === 'epic' ? 'エピック' :
                            character.equipment.weapon.rarity === 'rare' ? 'レア' :
                              character.equipment.weapon.rarity === 'uncommon' ? 'アンコモン' : 'コモン'}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 mb-1">武器</div>
                  {character.equipment.weapon && (
                    <>
                      <div className="text-xs text-gray-500 mb-2">{character.equipment.weapon.description}</div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {character.equipment.weapon.stats.attack && (
                          <span className="text-red-400">攻撃+{character.equipment.weapon.stats.attack}</span>
                        )}
                        {character.equipment.weapon.stats.magic && (
                          <span className="text-purple-400">魔力+{character.equipment.weapon.stats.magic}</span>
                        )}
                        {character.equipment.weapon.stats.stamina && (
                          <span className="text-orange-400">スタミナ+{character.equipment.weapon.stats.stamina}</span>
                        )}
                        {character.equipment.weapon.stats.defense && (
                          <span className="text-blue-400">防御+{character.equipment.weapon.stats.defense}</span>
                        )}
                        {character.equipment.weapon.stats.magicDefense && (
                          <span className="text-indigo-400">魔防+{character.equipment.weapon.stats.magicDefense}</span>
                        )}
                        {character.equipment.weapon.stats.agility && (
                          <span className="text-green-400">素早さ+{character.equipment.weapon.stats.agility}</span>
                        )}
                        {character.equipment.weapon.stats.luck && (
                          <span className="text-yellow-400">運+{character.equipment.weapon.stats.luck}</span>
                        )}
                        {character.equipment.weapon.stats.hp && (
                          <span className="text-emerald-400">HP+{character.equipment.weapon.stats.hp}</span>
                        )}
                        {character.equipment.weapon.stats.mp && (
                          <span className="text-cyan-400">MP+{character.equipment.weapon.stats.mp}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Armor */}
            <div className="p-3 bg-gray-700 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{character.equipment.armor?.icon || '🛡️'}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-bold">
                      {character.equipment.armor?.name || 'なし'}
                    </div>
                    {character.equipment.armor && (
                      <span className={`text-xs px-2 py-0.5 rounded ${character.equipment.armor.rarity === 'legendary' ? 'bg-amber-500/20 text-amber-400' :
                        character.equipment.armor.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                          character.equipment.armor.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
                            character.equipment.armor.rarity === 'uncommon' ? 'bg-green-500/20 text-green-400' :
                              'bg-gray-500/20 text-gray-400'
                        }`}>
                        {character.equipment.armor.rarity === 'legendary' ? 'レジェンダリー' :
                          character.equipment.armor.rarity === 'epic' ? 'エピック' :
                            character.equipment.armor.rarity === 'rare' ? 'レア' :
                              character.equipment.armor.rarity === 'uncommon' ? 'アンコモン' : 'コモン'}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 mb-1">防具</div>
                  {character.equipment.armor && (
                    <>
                      <div className="text-xs text-gray-500 mb-2">{character.equipment.armor.description}</div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {character.equipment.armor.stats.defense && (
                          <span className="text-blue-400">防御+{character.equipment.armor.stats.defense}</span>
                        )}
                        {character.equipment.armor.stats.hp && (
                          <span className="text-emerald-400">HP+{character.equipment.armor.stats.hp}</span>
                        )}
                        {character.equipment.armor.stats.stamina && (
                          <span className="text-orange-400">スタミナ+{character.equipment.armor.stats.stamina}</span>
                        )}
                        {character.equipment.armor.stats.magicDefense && (
                          <span className="text-indigo-400">魔防+{character.equipment.armor.stats.magicDefense}</span>
                        )}
                        {character.equipment.armor.stats.attack && (
                          <span className="text-red-400">攻撃+{character.equipment.armor.stats.attack}</span>
                        )}
                        {character.equipment.armor.stats.magic && (
                          <span className="text-purple-400">魔力+{character.equipment.armor.stats.magic}</span>
                        )}
                        {character.equipment.armor.stats.agility && (
                          <span className="text-green-400">素早さ+{character.equipment.armor.stats.agility}</span>
                        )}
                        {character.equipment.armor.stats.luck && (
                          <span className="text-yellow-400">運+{character.equipment.armor.stats.luck}</span>
                        )}
                        {character.equipment.armor.stats.mp && (
                          <span className="text-cyan-400">MP+{character.equipment.armor.stats.mp}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Accessory */}
            <div className="p-3 bg-gray-700 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{character.equipment.accessory?.icon || '💍'}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-bold">
                      {character.equipment.accessory?.name || 'なし'}
                    </div>
                    {character.equipment.accessory && (
                      <span className={`text-xs px-2 py-0.5 rounded ${character.equipment.accessory.rarity === 'legendary' ? 'bg-amber-500/20 text-amber-400' :
                        character.equipment.accessory.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                          character.equipment.accessory.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
                            character.equipment.accessory.rarity === 'uncommon' ? 'bg-green-500/20 text-green-400' :
                              'bg-gray-500/20 text-gray-400'
                        }`}>
                        {character.equipment.accessory.rarity === 'legendary' ? 'レジェンダリー' :
                          character.equipment.accessory.rarity === 'epic' ? 'エピック' :
                            character.equipment.accessory.rarity === 'rare' ? 'レア' :
                              character.equipment.accessory.rarity === 'uncommon' ? 'アンコモン' : 'コモン'}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 mb-1">アクセサリー</div>
                  {character.equipment.accessory && (
                    <>
                      <div className="text-xs text-gray-500 mb-2">{character.equipment.accessory.description}</div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {character.equipment.accessory.stats.luck && (
                          <span className="text-yellow-400">運+{character.equipment.accessory.stats.luck}</span>
                        )}
                        {character.equipment.accessory.stats.agility && (
                          <span className="text-green-400">素早さ+{character.equipment.accessory.stats.agility}</span>
                        )}
                        {character.equipment.accessory.stats.mp && (
                          <span className="text-cyan-400">MP+{character.equipment.accessory.stats.mp}</span>
                        )}
                        {character.equipment.accessory.stats.magicDefense && (
                          <span className="text-indigo-400">魔防+{character.equipment.accessory.stats.magicDefense}</span>
                        )}
                        {character.equipment.accessory.stats.attack && (
                          <span className="text-red-400">攻撃+{character.equipment.accessory.stats.attack}</span>
                        )}
                        {character.equipment.accessory.stats.defense && (
                          <span className="text-blue-400">防御+{character.equipment.accessory.stats.defense}</span>
                        )}
                        {character.equipment.accessory.stats.magic && (
                          <span className="text-purple-400">魔力+{character.equipment.accessory.stats.magic}</span>
                        )}
                        {character.equipment.accessory.stats.hp && (
                          <span className="text-emerald-400">HP+{character.equipment.accessory.stats.hp}</span>
                        )}
                        {character.equipment.accessory.stats.stamina && (
                          <span className="text-orange-400">スタミナ+{character.equipment.accessory.stats.stamina}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">冒険の記録</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-700 rounded-lg">
              <div className="font-bold text-2xl text-amber-400">
                {character.statistics.totalDiaries}
              </div>
              <div className="text-sm text-gray-400 mt-1">日記数</div>
            </div>
            <div className="text-center p-3 bg-gray-700 rounded-lg">
              <div className="font-bold text-2xl text-green-400">
                {character.statistics.consecutiveDays}
              </div>
              <div className="text-sm text-gray-400 mt-1">連続日数</div>
            </div>
            <div className="text-center p-3 bg-gray-700 rounded-lg">
              <div className="font-bold text-2xl text-blue-400">
                {character.statistics.totalExpEarned}
              </div>
              <div className="text-sm text-gray-400 mt-1">総獲得EXP</div>
            </div>
            <div className="text-center p-3 bg-gray-700 rounded-lg">
              <div className="font-bold text-2xl text-purple-400">
                {character.statistics.achievementsUnlocked}
              </div>
              <div className="text-sm text-gray-400 mt-1">実績数</div>
            </div>
          </div>
        </div>

        {/* Level Progress Chart */}
        <div className="bg-gray-800 rounded-lg p-6 lg:col-span-2">
          <h3 className="text-xl font-bold mb-4">レベル進捗</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={expProgressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="level"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
                label={{ value: 'レベル', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
                label={{ value: '必要経験値', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem'
                }}
                formatter={(value: number) => [`${value} EXP`, '必要経験値']}
              />
              <Bar dataKey="exp" name="必要経験値">
                {expProgressData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isCurrent ? '#F59E0B' : '#3B82F6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 text-center text-sm text-gray-400">
            <span className="inline-block w-3 h-3 bg-amber-500 rounded mr-1"></span>
            現在のレベル
            <span className="inline-block w-3 h-3 bg-blue-500 rounded ml-4 mr-1"></span>
            他のレベル
          </div>
        </div>

        {/* Name Mapping Management */}
        <div className="bg-gray-800 rounded-lg p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">固有名詞マッピング</h3>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-400">
                合計: <span className="font-bold text-white">{mappingStats.total}</span> /
                仮: <span className="font-bold text-yellow-400">{mappingStats.pending}</span> /
                確定: <span className="font-bold text-green-400">{mappingStats.confirmed}</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            日記変換時に使用される固有名詞のマッピングを管理できます。
            AIが自動抽出したマッピングは「仮」として保存されるため、確認して確定してください。
          </p>

          {/* Filter buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMappingFilter('all')}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${mappingFilter === 'all'
                ? 'bg-amber-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              すべて
            </button>
            <button
              onClick={() => setMappingFilter('pending')}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${mappingFilter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              仮 ({mappingStats.pending})
            </button>
            <button
              onClick={() => setMappingFilter('confirmed')}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${mappingFilter === 'confirmed'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              確定 ({mappingStats.confirmed})
            </button>
            <button
              onClick={() => setShowAddMappingForm(!showAddMappingForm)}
              className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
            >
              {showAddMappingForm ? '✖ 閉じる' : '➕ 手動追加'}
            </button>
          </div>

          {/* Add mapping form */}
          {showAddMappingForm && (
            <div className="mb-4 p-4 bg-gray-700 rounded-lg border-2 border-blue-500">
              <h4 className="font-bold mb-3">新しいマッピングを追加</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">現実世界の用語</label>
                  <input
                    type="text"
                    value={editingMappingForm.realWorld}
                    onChange={(e) =>
                      setEditingMappingForm((prev) => ({ ...prev, realWorld: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例: 会社"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">ファンタジー世界の用語</label>
                  <input
                    type="text"
                    value={editingMappingForm.fantasyWorld}
                    onChange={(e) =>
                      setEditingMappingForm((prev) => ({ ...prev, fantasyWorld: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例: ギルド本部"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">カテゴリ</label>
                  <select
                    value={editingMappingForm.category}
                    onChange={(e) =>
                      setEditingMappingForm((prev) => ({
                        ...prev,
                        category: e.target.value as NameMapping['category'],
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="location">📍 場所</option>
                    <option value="person">👤 人物</option>
                    <option value="organization">🏢 組織</option>
                    <option value="item">📦 アイテム</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleAddMapping}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                >
                  追加
                </button>
                <button
                  onClick={() => {
                    setShowAddMappingForm(false);
                    setEditingMappingForm({
                      realWorld: '',
                      fantasyWorld: '',
                      category: 'location',
                    });
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* Mappings list */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredMappings.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {mappingFilter === 'pending'
                  ? '仮マッピングはありません'
                  : mappingFilter === 'confirmed'
                    ? '確定済みマッピングはありません'
                    : 'マッピングはまだありません'}
              </div>
            ) : (
              filteredMappings.map((mapping) => {
                const isEditing = editingMappingId === mapping.id;
                const categoryIcons = {
                  location: '📍',
                  person: '👤',
                  organization: '🏢',
                  item: '📦',
                };
                const categoryLabels = {
                  location: '場所',
                  person: '人物',
                  organization: '組織',
                  item: 'アイテム',
                };

                return (
                  <div
                    key={mapping.id}
                    className={`p-3 rounded-lg border-2 ${mapping.status === 'pending'
                      ? 'bg-yellow-900/20 border-yellow-600'
                      : 'bg-green-900/20 border-green-600'
                      }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={editingMappingForm.realWorld}
                            onChange={(e) =>
                              setEditingMappingForm((prev) => ({
                                ...prev,
                                realWorld: e.target.value,
                              }))
                            }
                            className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={editingMappingForm.fantasyWorld}
                            onChange={(e) =>
                              setEditingMappingForm((prev) => ({
                                ...prev,
                                fantasyWorld: e.target.value,
                              }))
                            }
                            className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <select
                            value={editingMappingForm.category}
                            onChange={(e) =>
                              setEditingMappingForm((prev) => ({
                                ...prev,
                                category: e.target.value as NameMapping['category'],
                              }))
                            }
                            className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="location">📍 場所</option>
                            <option value="person">👤 人物</option>
                            <option value="organization">🏢 組織</option>
                            <option value="item">📦 アイテム</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveMapping}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded transition-colors"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => {
                              setEditingMappingId(null);
                              setEditingMappingForm({
                                realWorld: '',
                                fantasyWorld: '',
                                category: 'location',
                              });
                            }}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm font-bold rounded transition-colors"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <div className="text-xs text-gray-400">現実世界</div>
                            <div className="font-bold">{mapping.realWorld}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">ファンタジー世界</div>
                            <div className="font-bold text-amber-400">{mapping.fantasyWorld}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">カテゴリ</div>
                            <div className="text-sm">
                              {categoryIcons[mapping.category]} {categoryLabels[mapping.category]}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <div>使用: {mapping.frequency}回</div>
                        </div>
                        <div className="flex gap-2">
                          {mapping.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleEditMapping(mapping)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded transition-colors"
                                title="編集"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleConfirmMapping(mapping.id)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded transition-colors"
                                title="確定"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => handleRejectMapping(mapping.id)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded transition-colors"
                                title="拒否"
                              >
                                ✖
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditMapping(mapping)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded transition-colors"
                                title="編集"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteMapping(mapping.id)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded transition-colors"
                                title="削除"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

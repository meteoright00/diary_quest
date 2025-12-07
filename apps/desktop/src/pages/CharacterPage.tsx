import { useState, useEffect, useMemo } from 'react';
import { useCharacterStore } from '@/store/characterStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useWorldStore } from '@/store/worldStore';
import { CharacterManager, ExpCalculator } from '@diary-quest/core/character';
import { OpenAIProvider, ClaudeProvider, GeminiProvider } from '@diary-quest/core/llm';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { CharacterClass, NameMapping } from '@diary-quest/core/types';
import { generateId } from '@diary-quest/shared';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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

  // Confirmation states
  const [showDeleteClassConfirm, setShowDeleteClassConfirm] = useState(false);
  const [mappingToDeleteId, setMappingToDeleteId] = useState<string | null>(null);

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
      toast.warning('クラス名を入力してください');
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
      toast.error('AI生成に失敗しました。もう一度お試しください。');
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
    setShowDeleteClassConfirm(false);
    toast.success('オリジナルクラスを削除しました');
  };

  const handleCreateCustomClass = () => {
    if (!customClassForm.name || !customClassForm.description) {
      toast.warning('クラス名と説明を入力してください');
      return;
    }

    const filteredSpecialties = customClassForm.specialties.filter(s => s.trim() !== '');
    if (filteredSpecialties.length === 0) {
      toast.warning('少なくとも1つの特技を入力してください');
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
      toast.warning('名前を入力してください');
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
        toast.error('世界観設定が見つかりません。設定画面またはトップページから世界観を選択してください。');
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
      toast.success('キャラクターを作成しました！');
    } catch (error) {
      console.error('Failed to create character:', error);
      toast.error('キャラクターの作成に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
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

  const handleDeleteMapping = async () => {
    if (!currentCharacter || !mappingToDeleteId) return;

    const updatedMappings = currentCharacter.nameMappings.filter((m) => m.id !== mappingToDeleteId);
    const updatedCharacter = { ...currentCharacter, nameMappings: updatedMappings };

    await saveCharacter(updatedCharacter);
    setCurrentCharacter(updatedCharacter);
    setMappingToDeleteId(null);
    toast.success('マッピングを削除しました');
  };

  const handleAddMapping = async () => {
    if (!currentCharacter) return;

    if (!editingMappingForm.realWorld || !editingMappingForm.fantasyWorld) {
      toast.warning('現実世界の用語とファンタジー世界の用語を入力してください');
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
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-3xl font-bold mb-6 text-white drop-shadow-md">キャラクター</h2>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-magic-cyan border-t-transparent rounded-full animate-spin"></div>
          <p className="text-magic-cyan font-bold animate-pulse">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (showCreateForm || !currentCharacter) {
    return (
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h2 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 drop-shadow-sm text-center">
          キャラクター作成
        </h2>

        <div className="glass-panel rounded-2xl p-8 border-magic-gold/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-magic-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <p className="text-slate-300 mb-8 text-center text-lg">
            冒険を始めるために、<br />あなたの分身となるキャラクターを作成しましょう！
          </p>

          <div className="space-y-8">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2 pl-1">
                キャラクター名
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-5 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-gold focus:ring-1 focus:ring-magic-gold/50 text-white placeholder-slate-600 transition-all text-lg"
                placeholder="あなたの名前を入力..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-3 pl-1">
                クラスを選択
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableClasses.slice(0, 3).map((classOption) => (
                  <button
                    key={classOption.id}
                    type="button"
                    onClick={() => handleClassSelect(classOption)}
                    className={`p-5 rounded-xl border transition-all text-left relative overflow-hidden group ${formData.classId === classOption.id
                      ? 'border-magic-gold bg-magic-gold/10 shadow-[0_0_15px_rgba(251,191,36,0.1)]'
                      : 'border-white/10 bg-midnight-900/40 hover:border-white/20 hover:bg-white/5'
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-4xl group-hover:scale-110 transition-transform duration-300 drop-shadow-md">{classOption.icon || '⚔️'}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-bold mb-1 transition-colors ${formData.classId === classOption.id ? 'text-magic-gold' : 'text-white'}`}>
                          {classOption.name}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {classOption.description}
                        </p>
                        {classOption.specialties && classOption.specialties.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {classOption.specialties.slice(0, 2).map((specialty, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/5 rounded-full text-slate-300"
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
                    className={`p-5 rounded-xl border transition-all relative overflow-hidden group ${formData.classId === customClasses[0].id
                      ? 'border-magic-gold bg-magic-gold/10 shadow-[0_0_15px_rgba(251,191,36,0.1)]'
                      : 'border-white/10 bg-midnight-900/40 hover:border-white/20'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleClassSelect(customClasses[0])}
                      className="w-full text-left"
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl group-hover:scale-110 transition-transform duration-300 drop-shadow-md">{customClasses[0].icon || '✨'}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-bold mb-1 transition-colors flex items-center gap-2 ${formData.classId === customClasses[0].id ? 'text-magic-gold' : 'text-white'}`}>
                            {customClasses[0].name}
                            <span className="text-[10px] bg-magic-cyan/20 text-magic-cyan px-1.5 py-0.5 rounded border border-magic-cyan/30">オリジナル</span>
                          </h4>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {customClasses[0].description}
                          </p>
                          {customClasses[0].specialties && customClasses[0].specialties.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {customClasses[0].specialties.slice(0, 2).map((specialty, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/5 rounded-full text-slate-300"
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
                    <div className="mt-4 pt-3 border-t border-white/10 flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCustomClass(customClasses[0]);
                        }}
                        className="flex-1 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-blue-200 text-xs font-bold rounded-lg transition-colors border border-blue-500/30"
                      >
                        ✏️ 編集
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteClassConfirm(true);
                        }}
                        className="flex-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 text-xs font-bold rounded-lg transition-colors border border-red-500/30"
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
                    className="p-5 rounded-xl border-2 border-dashed border-white/10 bg-white/5 hover:border-magic-gold/50 hover:bg-magic-gold/5 transition-all group"
                  >
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <div className="bg-white/10 p-4 rounded-full group-hover:scale-110 transition-transform duration-300">
                        <span className="text-2xl">➕</span>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-white group-hover:text-magic-gold transition-colors">オリジナルクラス</div>
                        <div className="text-xs text-slate-400 mt-1">自分だけのクラスを作成</div>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handleCreateCharacter}
              className="w-full relative group overflow-hidden bg-gradient-to-r from-magic-gold to-orange-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-glow-gold hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative flex items-center justify-center gap-2 text-lg">
                <span className="text-2xl">⚔️</span> 冒険を始める
              </span>
            </button>
          </div>
        </div>

        {/* Custom Class Creation/Edit Modal */}
        {showCustomClassModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={() => {
            setShowCustomClassModal(false);
            setEditingCustomClassId(null);
          }}>
            <div className="glass-panel rounded-2xl p-8 max-w-md w-full mx-4 border-magic-cyan/30 animate-in fade-in zoom-in-95 duration-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                <span className="text-3xl text-magic-cyan">✨</span>
                {editingCustomClassId ? 'オリジナルクラスを編集' : 'オリジナルクラスを作成'}
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2 pl-1">
                    クラス名
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={customClassForm.name}
                    onChange={handleCustomClassInputChange}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-cyan focus:ring-1 focus:ring-magic-cyan/50 text-white placeholder-slate-600 transition-all font-bold"
                    placeholder="例: 剣聖、錬金術師、暗殺者..."
                  />
                </div>

                {/* AI生成ボタン - 条件付きUI */}
                {canUseAI ? (
                  <button
                    type="button"
                    onClick={handleGenerateWithAI}
                    disabled={!customClassForm.name || isGenerating}
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/20"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>魔法を詠唱中...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">🪄</span>
                        AIで説明と特技を生成
                      </>
                    )}
                  </button>
                ) : (
                  <div className="text-sm text-slate-300 p-4 border border-white/10 rounded-xl bg-white/5">
                    <p className="font-bold mb-3 flex items-center gap-2 text-amber-400">
                      <span>💡</span> AI生成を使用するには設定が必要です
                    </p>
                    <ul className="space-y-3">
                      {!llmSettings?.apiKey && (
                        <li className="flex items-center gap-2 p-2 bg-black/20 rounded-lg">
                          <span className="text-amber-400">→</span>
                          {onNavigate ? (
                            <button
                              type="button"
                              onClick={() => onNavigate('settings')}
                              className="text-magic-cyan hover:text-cyan-300 hover:underline transition-colors font-bold"
                            >
                              LLM APIキーを設定
                            </button>
                          ) : (
                            <span className="text-slate-400">設定ページでLLM APIキーを設定</span>
                          )}
                        </li>
                      )}
                      {!worldSettings && (
                        <li className="flex items-center gap-2 p-2 bg-black/20 rounded-lg">
                          <span className="text-amber-400">→</span>
                          {onNavigate ? (
                            <button
                              type="button"
                              onClick={() => onNavigate('welcome')}
                              className="text-magic-cyan hover:text-cyan-300 hover:underline transition-colors font-bold"
                            >
                              世界観を選択
                            </button>
                          ) : (
                            <span className="text-slate-400">ようこそページで世界観を選択</span>
                          )}
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2 pl-1">
                    説明
                  </label>
                  <textarea
                    name="description"
                    value={customClassForm.description}
                    onChange={handleCustomClassInputChange}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-cyan focus:ring-1 focus:ring-magic-cyan/50 text-white placeholder-slate-600 transition-all resize-none leading-relaxed"
                    rows={3}
                    placeholder="このクラスの特徴や能力を説明..."
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-300 mb-2 pl-1">
                      アイコン
                    </label>
                    <input
                      type="text"
                      name="icon"
                      value={customClassForm.icon}
                      onChange={handleCustomClassInputChange}
                      className="w-full px-2 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-cyan text-white text-center text-xl"
                      placeholder="✨"
                      maxLength={2}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-bold text-slate-300 mb-2 pl-1">
                      特技（最大3つ）
                    </label>
                    <div className="space-y-2">
                      {customClassForm.specialties.map((specialty, idx) => (
                        <input
                          key={idx}
                          type="text"
                          value={specialty}
                          onChange={(e) => handleSpecialtyChange(idx, e.target.value)}
                          className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:border-magic-cyan text-sm text-white placeholder-slate-600"
                          placeholder={`特技 ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => {
                      setShowCustomClassModal(false);
                      setEditingCustomClassId(null);
                    }}
                    className="flex-1 px-4 py-3 bg-transparent hover:bg-white/5 text-slate-400 font-bold rounded-xl transition-colors border border-white/10"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleCreateCustomClass}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-magic-cyan to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-cyan-500/20"
                  >
                    {editingCustomClassId ? '保存する' : '作成する'}
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
    <div className="max-w-6xl mx-auto space-y-8">
      <h2 className="text-3xl font-bold mb-6 text-white drop-shadow-md">キャラクター</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Info */}
        <div className="glass-panel rounded-2xl p-6 border-magic-cyan/20">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <span className="text-2xl drop-shadow-glow">📜</span> 基本情報
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-midnight-900/40 p-3 rounded-xl border border-white/5">
              <span className="text-slate-400">名前</span>
              <span className="font-bold text-lg text-white">{character.basicInfo.name}</span>
            </div>
            <div className="flex justify-between items-center bg-midnight-900/40 p-3 rounded-xl border border-white/5">
              <span className="text-slate-400">クラス</span>
              <span className="font-bold text-lg text-magic-cyan">{character.basicInfo.class}</span>
            </div>
            <div className="flex justify-between items-center bg-midnight-900/40 p-3 rounded-xl border border-white/5">
              <span className="text-slate-400">称号</span>
              <span className="font-bold text-white">{character.basicInfo.title}</span>
            </div>
            <div className="flex justify-between items-center bg-midnight-900/40 p-3 rounded-xl border border-white/5">
              <span className="text-slate-400">ギルド</span>
              <span className="font-bold text-magic-gold">{character.basicInfo.guild}</span>
            </div>
          </div>
        </div>

        {/* Level & Experience */}
        <div className="glass-panel rounded-2xl p-6 border-magic-gold/20">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <span className="text-2xl drop-shadow-glow">✨</span> レベル
          </h3>
          <div className="space-y-6">
            <div className="text-center relative py-4">
              <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-magic-gold to-orange-500 drop-shadow-sm">{character.level.current}</div>
              <div className="text-sm text-slate-400 mt-1 uppercase tracking-widest font-semibold">Level</div>
            </div>
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-slate-400">経験値</span>
                <span className="font-bold text-magic-cyan font-mono">
                  {character.level.exp} <span className="text-slate-600">/</span> {character.level.expToNextLevel}
                </span>
              </div>
              <div className="w-full bg-midnight-900 rounded-full h-4 border border-white/10 shadow-inner">
                <div
                  className="bg-gradient-to-r from-magic-cyan to-blue-600 h-full rounded-full transition-all duration-1000 shadow-glow-cyan"
                  style={{ width: `${expPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="glass-panel rounded-2xl p-6 border-white/10">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <span className="text-2xl drop-shadow-glow">📊</span> ステータス
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-400 font-medium">HP</span>
                <span className="font-bold text-red-400 font-mono">
                  {character.stats.hp.current} / {character.stats.hp.max}
                </span>
              </div>
              <div className="w-full bg-midnight-900 rounded-full h-3 border border-white/5">
                <div
                  className="bg-gradient-to-r from-red-600 to-red-400 h-full rounded-full shadow-[0_0_8px_rgba(248,113,113,0.5)]"
                  style={{ width: `${hpPercent}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-400 font-medium">MP</span>
                <span className="font-bold text-blue-400 font-mono">
                  {character.stats.mp.current} / {character.stats.mp.max}
                </span>
              </div>
              <div className="w-full bg-midnight-900 rounded-full h-3 border border-white/5">
                <div
                  className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full shadow-[0_0_8px_rgba(96,165,250,0.5)]"
                  style={{ width: `${mpPercent}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-400 font-medium">スタミナ</span>
                <span className="font-bold text-orange-400 font-mono">
                  {character.stats.stamina.current} / {character.stats.stamina.max}
                </span>
              </div>
              <div className="w-full bg-midnight-900 rounded-full h-3 border border-white/5">
                <div
                  className="bg-gradient-to-r from-orange-600 to-orange-400 h-full rounded-full shadow-[0_0_8px_rgba(251,146,60,0.5)]"
                  style={{ width: `${staminaPercent}%` }}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              {[
                { label: '攻撃力', value: character.stats.attack, color: 'text-red-400' },
                { label: '防御力', value: character.stats.defense, color: 'text-blue-400' },
                { label: '魔力', value: character.stats.magic, color: 'text-purple-400' },
                { label: '魔法防御', value: character.stats.magicDefense, color: 'text-indigo-400' },
                { label: '素早さ', value: character.stats.agility, color: 'text-green-400' },
                { label: '運', value: character.stats.luck, color: 'text-yellow-400' },
              ].map((stat) => (
                <div key={stat.label} className="text-center bg-midnight-900/40 p-3 rounded-xl border border-white/5">
                  <div className="text-slate-500 text-xs mb-1">{stat.label}</div>
                  <div className={`font-bold text-xl ${stat.color} font-mono`}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Currency */}
        <div className="glass-panel rounded-2xl p-6 border-magic-gold/20">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <span className="text-2xl drop-shadow-glow">💰</span> 所持金
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-midnight-900/60 rounded-xl border border-magic-gold/10">
              <span className="text-4xl filter drop-shadow-md">💰</span>
              <div className="text-right">
                <div className="font-bold text-2xl text-magic-gold font-mono">{character.currency.gold.toLocaleString()}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Gold</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-midnight-900/60 rounded-xl border border-white/5">
              <span className="text-4xl filter drop-shadow-md">🪙</span>
              <div className="text-right">
                <div className="font-bold text-2xl text-slate-300 font-mono">{character.currency.silver.toLocaleString()}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Silver</div>
              </div>
            </div>
          </div>
        </div>

        {/* Equipment */}
        <div className="glass-panel rounded-2xl p-6 border-white/10 lg:col-span-2">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
            <span className="text-2xl drop-shadow-glow">⚔️</span> 装備
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Equipment Items */}
            {[
              { type: 'weapon', label: '武器', icon: '🗡️', item: character.equipment.weapon },
              { type: 'armor', label: '防具', icon: '🛡️', item: character.equipment.armor },
              { type: 'accessory', label: 'アクセサリー', icon: '💍', item: character.equipment.accessory },
            ].map((eq) => (
              <div key={eq.type} className="p-4 bg-midnight-900/60 rounded-xl border border-white/10 hover:border-magic-cyan/30 transition-colors group">
                <div className="flex items-start gap-4">
                  <span className="text-4xl filter drop-shadow-md group-hover:scale-110 transition-transform">{eq.item?.icon || eq.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <div className="font-bold text-white truncate w-full">
                        {eq.item?.name || 'なし'}
                      </div>
                      {eq.item && (
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${eq.item.rarity === 'legendary' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          eq.item.rarity === 'epic' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                            eq.item.rarity === 'rare' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                              eq.item.rarity === 'uncommon' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                                'bg-slate-500/10 text-slate-400 border-slate-500/30'
                          }`}>
                          {eq.item.rarity === 'legendary' ? 'LEGENDARY' :
                            eq.item.rarity === 'epic' ? 'EPIC' :
                              eq.item.rarity === 'rare' ? 'RARE' :
                                eq.item.rarity === 'uncommon' ? 'UNCOMMON' : 'COMMON'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide">{eq.label}</div>
                    {eq.item && (
                      <>
                        <div className="text-xs text-slate-300 mb-3 line-clamp-2">{eq.item.description}</div>
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          {Object.entries(eq.item.stats).map(([stat, val]) => val ? (
                            <span key={stat} className="bg-white/5 px-1.5 py-0.5 rounded text-slate-300">
                              {stat === 'attack' ? '攻' : stat === 'defense' ? '防' : stat === 'magic' ? '魔' : '他'}+{val}
                            </span>
                          ) : null)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="glass-panel rounded-2xl p-6 border-white/10">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <span className="text-2xl drop-shadow-glow">🏆</span> 冒険の記録
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: '日記数', value: character.statistics.totalDiaries, color: 'text-magic-gold' },
              { label: '連続日数', value: character.statistics.consecutiveDays, color: 'text-green-400' },
              { label: '総獲得EXP', value: character.statistics.totalExpEarned, color: 'text-blue-400' },
              { label: '実績数', value: character.statistics.achievementsUnlocked, color: 'text-purple-400' },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 bg-midnight-900/60 rounded-xl border border-white/5">
                <div className={`font-bold text-2xl ${stat.color} font-mono`}>
                  {stat.value.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Level Progress Chart */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-2 border-white/10">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <span className="text-2xl drop-shadow-glow">📈</span> レベル進捗
          </h3>
          <div className="h-[300px] w-full bg-midnight-900/40 rounded-xl p-4 border border-white/5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expProgressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="level"
                  stroke="#64748b"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                  cursor={{ fill: '#1e293b', opacity: 0.5 }}
                />
                <Bar dataKey="exp" radius={[4, 4, 0, 0]}>
                  {expProgressData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isCurrent ? '#fbbf24' : '#3b82f6'}
                      fillOpacity={entry.isCurrent ? 1 : 0.6}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Name Mapping Management */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-2 border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
              <span className="text-2xl drop-shadow-glow">🗺️</span> 固有名詞マッピング
            </h3>
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-400 bg-midnight-900/40 px-3 py-1.5 rounded-full border border-white/5">
                合計: <span className="font-bold text-white ml-1">{mappingStats.total}</span>
                <span className="mx-2 opacity-30">|</span>
                仮: <span className="font-bold text-magic-gold ml-1">{mappingStats.pending}</span>
                <span className="mx-2 opacity-30">|</span>
                確定: <span className="font-bold text-green-400 ml-1">{mappingStats.confirmed}</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-400 mb-6 bg-midnight-900/40 p-4 rounded-xl border border-white/5">
            💡 日記変換時に使用される固有名詞のマッピングを管理できます。AIが自動抽出したマッピングは「仮」として保存されるため、確認して確定してください。
          </p>

          {/* Filter buttons */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMappingFilter('all')}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${mappingFilter === 'all'
                ? 'bg-gradient-to-r from-slate-700 to-slate-600 text-white shadow-lg scale-105'
                : 'bg-midnight-900/60 text-slate-400 hover:bg-midnight-900/80 hover:text-white border border-white/5'
                }`}
            >
              すべて
            </button>
            <button
              onClick={() => setMappingFilter('pending')}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${mappingFilter === 'pending'
                ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg scale-105'
                : 'bg-midnight-900/60 text-slate-400 hover:bg-midnight-900/80 hover:text-white border border-white/5'
                }`}
            >
              仮 ({mappingStats.pending})
            </button>
            <button
              onClick={() => setMappingFilter('confirmed')}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${mappingFilter === 'confirmed'
                ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg scale-105'
                : 'bg-midnight-900/60 text-slate-400 hover:bg-midnight-900/80 hover:text-white border border-white/5'
                }`}
            >
              確定 ({mappingStats.confirmed})
            </button>
            <button
              onClick={() => setShowAddMappingForm(!showAddMappingForm)}
              className="ml-auto px-4 py-2 bg-gradient-to-r from-magic-cyan to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-cyan-500/20 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {showAddMappingForm ? '✖ 閉じる' : '➕ 手動追加'}
            </button>
          </div>

          {/* Add mapping form */}
          {showAddMappingForm && (
            <div className="mb-6 p-6 bg-midnight-900/60 rounded-2xl border border-magic-cyan/30 animate-in fade-in slide-in-from-top-2">
              <h4 className="font-bold mb-4 text-white flex items-center gap-2">
                <span className="text-magic-cyan">✨</span> 新しいマッピングを追加
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">現実世界の用語</label>
                  <input
                    type="text"
                    value={editingMappingForm.realWorld}
                    onChange={(e) =>
                      setEditingMappingForm((prev) => ({ ...prev, realWorld: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-cyan focus:ring-1 focus:ring-magic-cyan/50 text-white placeholder-slate-600 transition-all"
                    placeholder="例: 上司、会社"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">ファンタジー世界の用語</label>
                  <input
                    type="text"
                    value={editingMappingForm.fantasyWorld}
                    onChange={(e) =>
                      setEditingMappingForm((prev) => ({ ...prev, fantasyWorld: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-gold focus:ring-1 focus:ring-magic-gold/50 text-white placeholder-slate-600 transition-all"
                    placeholder="例: 騎士団長、ギルド本部"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">カテゴリ</label>
                  <select
                    value={editingMappingForm.category}
                    onChange={(e) =>
                      setEditingMappingForm((prev) => ({
                        ...prev,
                        category: e.target.value as NameMapping['category'],
                      }))
                    }
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-magic-cyan focus:ring-1 focus:ring-magic-cyan/50 text-white transition-all appearance-none"
                  >
                    <option value="location">📍 場所</option>
                    <option value="person">👤 人物</option>
                    <option value="organization">🏢 組織</option>
                    <option value="item">📦 アイテム</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleAddMapping}
                  className="px-6 py-2 bg-magic-cyan text-black font-bold rounded-xl hover:bg-cyan-300 transition-colors shadow-lg shadow-cyan-500/10"
                >
                  追加する
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
                  className="px-6 py-2 bg-transparent hover:bg-white/5 text-slate-400 font-bold rounded-xl transition-colors border border-white/10"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* Mappings list */}
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
            {filteredMappings.length === 0 ? (
              <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-3">
                <span className="text-4xl opacity-50">📭</span>
                <p>
                  {mappingFilter === 'pending'
                    ? '仮マッピングはありません'
                    : mappingFilter === 'confirmed'
                      ? '確定済みマッピングはありません'
                      : 'マッピングはまだ登録されていません'}
                </p>
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
                    className={`p-4 rounded-xl border transition-all ${mapping.status === 'pending'
                      ? 'bg-yellow-900/10 border-yellow-500/30'
                      : 'bg-midnight-900/40 border-white/5 hover:border-white/10'
                      }`}
                  >
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            type="text"
                            value={editingMappingForm.realWorld}
                            onChange={(e) =>
                              setEditingMappingForm((prev) => ({
                                ...prev,
                                realWorld: e.target.value,
                              }))
                            }
                            className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:border-magic-cyan text-white"
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
                            className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:border-magic-gold text-white"
                          />
                          <select
                            value={editingMappingForm.category}
                            onChange={(e) =>
                              setEditingMappingForm((prev) => ({
                                ...prev,
                                category: e.target.value as NameMapping['category'],
                              }))
                            }
                            className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:border-magic-cyan text-white"
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
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors"
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
                            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-bold rounded-lg transition-colors"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-xs text-slate-500 mb-1">現実世界</div>
                            <div className="font-bold text-white">{mapping.realWorld}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">ファンタジー世界</div>
                            <div className="font-bold text-magic-gold text-lg">{mapping.fantasyWorld}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">カテゴリ</div>
                            <div className="text-sm text-slate-300 flex items-center gap-2">
                              {categoryIcons[mapping.category]} {categoryLabels[mapping.category]}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-xs text-slate-500 hidden sm:block">
                            使用: <span className="text-slate-300">{mapping.frequency}回</span>
                          </div>
                          <div className="flex gap-2">
                            {mapping.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleEditMapping(mapping)}
                                  className="w-8 h-8 flex items-center justify-center bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors border border-blue-500/30"
                                  title="編集"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleConfirmMapping(mapping.id)}
                                  className="w-8 h-8 flex items-center justify-center bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors border border-green-500/30"
                                  title="確定"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => handleRejectMapping(mapping.id)}
                                  className="w-8 h-8 flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors border border-red-500/30"
                                  title="拒否"
                                >
                                  ✖
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditMapping(mapping)}
                                  className="w-8 h-8 flex items-center justify-center bg-slate-700/50 hover:bg-blue-500/20 hover:text-blue-400 text-slate-400 rounded-lg transition-colors border border-white/5"
                                  title="編集"
                                >
                                  ✏️
                                </button>
                                <button

                                  onClick={() => setMappingToDeleteId(mapping.id)}
                                  className="w-8 h-8 flex items-center justify-center bg-slate-700/50 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-lg transition-colors border border-white/5"
                                  title="削除"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <AlertDialog open={showDeleteClassConfirm} onOpenChange={setShowDeleteClassConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>オリジナルクラスの削除</AlertDialogTitle>
                <AlertDialogDescription>
                  このクラスを削除してもよろしいですか？<br />
                  この操作は取り消せません。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCustomClass}>
                  削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={!!mappingToDeleteId} onOpenChange={(open) => !open && setMappingToDeleteId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>マッピングの削除</AlertDialogTitle>
                <AlertDialogDescription>
                  このマッピング・定義を削除してもよろしいですか？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteMapping}>
                  削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

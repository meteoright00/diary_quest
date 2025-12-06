import type { Equipment } from '@diary-quest/core/types';

interface EquipmentFoundModalProps {
  equipment: Equipment; // 新しく見つけた装備
  currentEquipment: Equipment | null; // 現在装備中のアイテム
  onEquip: () => void; // 装備する
  onDiscard: () => void; // 捨てる
  onClose: () => void;
}

const RARITY_COLORS = {
  common: 'text-gray-400 border-gray-500',
  uncommon: 'text-green-400 border-green-500',
  rare: 'text-blue-400 border-blue-500',
  epic: 'text-purple-400 border-purple-500',
  legendary: 'text-amber-400 border-amber-500',
};

const RARITY_LABELS = {
  common: 'コモン',
  uncommon: 'アンコモン',
  rare: 'レア',
  epic: 'エピック',
  legendary: 'レジェンダリー',
};

const RARITY_STARS = {
  common: '⭐',
  uncommon: '⭐⭐',
  rare: '⭐⭐⭐',
  epic: '⭐⭐⭐⭐',
  legendary: '⭐⭐⭐⭐⭐',
};

export default function EquipmentFoundModal({
  equipment,
  currentEquipment,
  onEquip,
  onDiscard,
  onClose,
}: EquipmentFoundModalProps) {
  const renderEquipmentCard = (eq: Equipment, isNew: boolean) => {
    return (
      <div className={`flex-1 p-4 rounded-lg border-2 ${RARITY_COLORS[eq.rarity]} bg-gray-800`}>
        <div className="text-center mb-3">
          {isNew && <div className="text-amber-400 text-sm font-bold mb-2">✨ NEW!</div>}
          <div className="text-4xl mb-2">{eq.icon}</div>
          <h4 className={`font-bold text-lg mb-1 ${RARITY_COLORS[eq.rarity]}`}>
            {eq.name}
          </h4>
          <div className="text-xs text-gray-400 mb-1">
            {RARITY_STARS[eq.rarity]} {RARITY_LABELS[eq.rarity]}
          </div>
        </div>

        <div className="text-sm text-gray-300 mb-3 line-clamp-2 min-h-[2.5rem]">
          {eq.description}
        </div>

        <div className="space-y-1 text-sm">
          {eq.stats.attack && eq.stats.attack > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">攻撃力</span>
              <span className="text-red-400 font-bold">+{eq.stats.attack}</span>
            </div>
          )}
          {eq.stats.defense && eq.stats.defense > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">防御力</span>
              <span className="text-blue-400 font-bold">+{eq.stats.defense}</span>
            </div>
          )}
          {eq.stats.magic && eq.stats.magic > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">魔力</span>
              <span className="text-purple-400 font-bold">+{eq.stats.magic}</span>
            </div>
          )}
          {eq.stats.magicDefense && eq.stats.magicDefense > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">魔法防御</span>
              <span className="text-cyan-400 font-bold">+{eq.stats.magicDefense}</span>
            </div>
          )}
          {eq.stats.agility && eq.stats.agility > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">素早さ</span>
              <span className="text-green-400 font-bold">+{eq.stats.agility}</span>
            </div>
          )}
          {eq.stats.luck && eq.stats.luck > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">運</span>
              <span className="text-yellow-400 font-bold">+{eq.stats.luck}</span>
            </div>
          )}
          {eq.stats.hp && eq.stats.hp > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">HP</span>
              <span className="text-green-400 font-bold">+{eq.stats.hp}</span>
            </div>
          )}
          {eq.stats.mp && eq.stats.mp > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">MP</span>
              <span className="text-blue-400 font-bold">+{eq.stats.mp}</span>
            </div>
          )}
          {eq.stats.stamina && eq.stats.stamina > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">スタミナ</span>
              <span className="text-orange-400 font-bold">+{eq.stats.stamina}</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-xs text-gray-500">
            必要レベル: {eq.requiredLevel}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold mb-2">🎉 新しい装備を発見！</h2>
          <p className="text-gray-400">
            {currentEquipment
              ? '現在の装備と交換しますか？'
              : 'この装備を装着しますか？'}
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          {/* 新しい装備 */}
          <div className="flex-1">
            <div className="text-center text-sm text-gray-400 mb-2 font-bold">
              新しい装備
            </div>
            {renderEquipmentCard(equipment, true)}
          </div>

          {/* VS */}
          <div className="flex items-center justify-center px-4">
            <div className="text-4xl text-gray-600">⚡</div>
          </div>

          {/* 現在の装備 */}
          <div className="flex-1">
            <div className="text-center text-sm text-gray-400 mb-2 font-bold">
              現在の装備
            </div>
            {currentEquipment ? (
              renderEquipmentCard(currentEquipment, false)
            ) : (
              <div className="flex-1 p-4 rounded-lg border-2 border-dashed border-gray-600 bg-gray-800 flex items-center justify-center min-h-[300px]">
                <div className="text-center text-gray-500">
                  <div className="text-6xl mb-2">∅</div>
                  <div className="text-sm">装備なし</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-3">
          <button
            onClick={onDiscard}
            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
          >
            🗑️ 捨てる
          </button>
          <button
            onClick={onEquip}
            className="flex-1 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors"
          >
            ⚔️ 装備する
          </button>
        </div>
      </div>
    </div>
  );
}

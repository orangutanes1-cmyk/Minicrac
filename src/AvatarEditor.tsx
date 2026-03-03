import { useStore } from './store';

export const AvatarEditor = () => {
  const avatarConfig = useStore((state) => state.avatarConfig);
  const setAvatarConfig = useStore((state) => state.setAvatarConfig);
  const isEditingAvatar = useStore((state) => state.isEditingAvatar);
  const setIsEditingAvatar = useStore((state) => state.setIsEditingAvatar);

  if (!isEditingAvatar) return null;

  const handleChange = (key: keyof typeof avatarConfig, value: number | string) => {
    setAvatarConfig({ [key]: value });
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-black/80 text-white p-6 overflow-y-auto pointer-events-auto backdrop-blur-sm border-l border-white/10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Avatar Editor</h2>
        <button 
          onClick={() => setIsEditingAvatar(false)}
          className="text-white/50 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Dimensions</h3>
          
          <div className="space-y-2">
            <label className="text-sm flex justify-between">
              <span>Head Size</span>
              <span>{avatarConfig.headSize.toFixed(2)}</span>
            </label>
            <input type="range" min="0.4" max="1.5" step="0.05" value={avatarConfig.headSize} onChange={(e) => handleChange('headSize', parseFloat(e.target.value))} className="w-full" />
          </div>

          <div className="space-y-2">
            <label className="text-sm flex justify-between">
              <span>Torso Width</span>
              <span>{avatarConfig.torsoWidth.toFixed(2)}</span>
            </label>
            <input type="range" min="0.4" max="1.5" step="0.05" value={avatarConfig.torsoWidth} onChange={(e) => handleChange('torsoWidth', parseFloat(e.target.value))} className="w-full" />
          </div>

          <div className="space-y-2">
            <label className="text-sm flex justify-between">
              <span>Torso Height</span>
              <span>{avatarConfig.torsoHeight.toFixed(2)}</span>
            </label>
            <input type="range" min="0.4" max="1.5" step="0.05" value={avatarConfig.torsoHeight} onChange={(e) => handleChange('torsoHeight', parseFloat(e.target.value))} className="w-full" />
          </div>

          <div className="space-y-2">
            <label className="text-sm flex justify-between">
              <span>Arm Width</span>
              <span>{avatarConfig.armWidth.toFixed(2)}</span>
            </label>
            <input type="range" min="0.2" max="0.8" step="0.05" value={avatarConfig.armWidth} onChange={(e) => handleChange('armWidth', parseFloat(e.target.value))} className="w-full" />
          </div>

          <div className="space-y-2">
            <label className="text-sm flex justify-between">
              <span>Arm Length</span>
              <span>{avatarConfig.armLength.toFixed(2)}</span>
            </label>
            <input type="range" min="0.4" max="1.5" step="0.05" value={avatarConfig.armLength} onChange={(e) => handleChange('armLength', parseFloat(e.target.value))} className="w-full" />
          </div>

          <div className="space-y-2">
            <label className="text-sm flex justify-between">
              <span>Leg Width</span>
              <span>{avatarConfig.legWidth.toFixed(2)}</span>
            </label>
            <input type="range" min="0.2" max="0.8" step="0.05" value={avatarConfig.legWidth} onChange={(e) => handleChange('legWidth', parseFloat(e.target.value))} className="w-full" />
          </div>

          <div className="space-y-2">
            <label className="text-sm flex justify-between">
              <span>Leg Length</span>
              <span>{avatarConfig.legLength.toFixed(2)}</span>
            </label>
            <input type="range" min="0.4" max="1.5" step="0.05" value={avatarConfig.legLength} onChange={(e) => handleChange('legLength', parseFloat(e.target.value))} className="w-full" />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Colors</h3>
          
          <div className="flex justify-between items-center">
            <label className="text-sm">Skin Color</label>
            <input type="color" value={avatarConfig.skinColor} onChange={(e) => handleChange('skinColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
          </div>
          <div className="flex justify-between items-center">
            <label className="text-sm">Shirt Color</label>
            <input type="color" value={avatarConfig.shirtColor} onChange={(e) => handleChange('shirtColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
          </div>
          <div className="flex justify-between items-center">
            <label className="text-sm">Pants Color</label>
            <input type="color" value={avatarConfig.pantsColor} onChange={(e) => handleChange('pantsColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
          </div>
          <div className="flex justify-between items-center">
            <label className="text-sm">Eye Color</label>
            <input type="color" value={avatarConfig.eyeColor} onChange={(e) => handleChange('eyeColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
          </div>
        </div>
      </div>
    </div>
  );
};

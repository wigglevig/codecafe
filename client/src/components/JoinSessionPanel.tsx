import { motion, AnimatePresence } from "framer-motion";
import { JoinSessionPanelProps } from "../types/props";

const JoinSessionPanel = ({
  userName,
  userColor,
  isColorPickerOpen,
  colors,
  onNameChange,
  onColorSelect,
  onToggleColorPicker,
  onConfirmJoin,
}: JoinSessionPanelProps) => {
  return (
    <div className="flex flex-col h-full bg-stone-800 bg-opacity-60">
      <div className="pl-4 py-2 text-xs text-stone-400 sticky top-0 bg-stone-800 bg-opacity-60 z-10 flex-shrink-0">
        JOIN SESSION
      </div>

      <div className="flex-1 flex flex-col p-4 overflow-y-auto">
        <div className="flex items-end gap-3 mb-4">
          <div className="relative flex-shrink-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium cursor-pointer shadow-md ring-1 ring-stone-500/50"
              style={{ backgroundColor: userColor }}
              onClick={onToggleColorPicker}
            >
              <span className="text-white/90">
                {userName ? userName[0].toUpperCase() : ""}
              </span>
            </div>

            {/* Color Picker Popover*/}
            <AnimatePresence>
              {isColorPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -5 }}
                  transition={{ duration: 0.1 }}
                  className="absolute left-0 top-full mt-2 bg-neutral-900/90 backdrop-blur-sm p-2.5 border border-stone-700 shadow-lg z-10 w-[120px]"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {colors.map((color) => (
                      <div
                        key={color}
                        className={`w-5 h-5 rounded-full cursor-pointer ${
                          userColor === color ? "ring-2 ring-white/60" : ""
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => onColorSelect(color)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Name Input Container */}
          <div className="flex-1">
            <label className="block text-xs text-stone-400 mb-1">
              Your Display Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={onNameChange}
              placeholder="Enter your name"
              className="w-full bg-neutral-800 border border-stone-600 text-stone-200 placeholder-stone-500 px-2 py-1 text-sm focus:outline-none focus:border-stone-500 transition-colors rounded-sm"
            />
          </div>
        </div>

        {/* Join Session Button */}
        <button
          onClick={onConfirmJoin}
          disabled={!userName.trim()}
          className="w-full mt-auto px-3 py-1.5 text-sm font-medium bg-stone-600 hover:bg-stone-500 text-stone-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0" // Added flex-shrink-0
        >
          Join Session
        </button>
      </div>
    </div>
  );
};

export default JoinSessionPanel;

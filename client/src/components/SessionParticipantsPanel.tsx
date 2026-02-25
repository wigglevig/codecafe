import { SessionParticipantsPanelProps } from "../types/props";

const SessionParticipantsPanel = ({
  participants,
  localUser,
  activeIcon,
}: SessionParticipantsPanelProps) => {
  if (activeIcon !== "share") {
    return null;
  }

  return (
    <div className="flex flex-col flex-1 text-sm text-stone-300">
      <div className="pl-4 py-2 text-xs text-stone-400 sticky top-0 bg-stone-800 bg-opacity-95 z-10">
        PARTICIPANTS
      </div>
      <ul
        className={`overflow-y-auto divide-y divide-stone-700 ${
          participants.length > 0 ? "border-b border-stone-700" : ""
        }`}
      >
        {/* Local User */}
        <li key="local-user" className="flex items-center pl-4 pr-2 py-2.5">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ring-1 ring-black/20 shadow-sm mr-2 flex-shrink-0"
            style={{ backgroundColor: localUser.color }}
            title={`You: ${localUser.name} (Color: ${localUser.color})`}
          >
            <span className="text-white/90 select-none">
              {localUser.name ? localUser.name[0].toUpperCase() : "?"}
            </span>
          </div>
          <span className="truncate">{localUser.name} (You)</span>
        </li>

        {/* Remote Users */}
        {participants.map((user) => (
          <li key={user.id} className="flex items-center pl-4 pr-2 py-2.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ring-1 ring-black/20 shadow-sm mr-2 flex-shrink-0"
              style={{ backgroundColor: user.color }}
              title={`User: ${user.name} (Color: ${user.color})`}
            >
              <span className="text-white/90 select-none">
                {user.name ? user.name[0].toUpperCase() : "?"}
              </span>
            </div>
            <span className="truncate">{user.name}</span>
          </li>
        ))}
        {participants.length === 0 && (
          <li className="pl-4 pr-2 py-2.5 text-stone-500 italic">
            No other participants yet.
          </li>
        )}
      </ul>
    </div>
  );
};

export default SessionParticipantsPanel;

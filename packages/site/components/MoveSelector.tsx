import { FaHandRock, FaHandPaper, FaHandScissors } from "react-icons/fa";

export function MoveButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 transform hover:scale-105 
        ${
          active
            ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100"
            : "border-gray-200 hover:border-yellow-300 hover:bg-gradient-to-br hover:from-yellow-25 hover:to-yellow-50"
        }`}
    >
      {children}
    </button>
  );
}

export function MoveSelectorModal({
  modalMode,
  setSelectedMove,
  setModalMode,
  selectedMove,
  setShowMoveSelector,
  handleSubmitMove,
  isSubmittingMove,
}: {
  modalMode: "join" | "submit";
  setSelectedMove: (move: number) => void;
  setModalMode: (mode: "join" | "submit") => void;
  selectedMove: number | null;
  setShowMoveSelector: (show: boolean) => void;
  handleSubmitMove: () => void;
  isSubmittingMove: boolean;
}) {
  const moves = [
    {
      icon: FaHandRock,
      label: "Rock",
    },
    {
      icon: FaHandPaper,
      label: "Paper",
    },
    {
      icon: FaHandScissors,
      label: "Scissors",
      className: "rotate-90",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full mx-4 border-2 border-black">
        <h3 className="text-xl font-bold mb-6 text-center text-black">
          {modalMode === "join"
            ? "Choose Your Move to Join Game"
            : "Choose Your Move"}
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {moves.map((move, index) => {
            const isActive = selectedMove === index;
            return (
              <MoveButton
                key={index}
                onClick={() => setSelectedMove(index)}
                active={isActive}
              >
                <move.icon
                  className={`text-4xl mb-2 transition-colors ${isActive ? "text-yellow-700" : "text-gray-600"} ${move.className}`}
                />
                <span className="font-semibold text-black">{move.label}</span>
              </MoveButton>
            );
          })}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowMoveSelector(false);
              setSelectedMove(0);
              setModalMode("submit");
            }}
            className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg text-slate-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 hover:border-slate-400 font-semibold transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitMove}
            disabled={selectedMove === null || isSubmittingMove}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-500 hover:to-green-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
          >
            {isSubmittingMove
              ? modalMode === "join"
                ? "Joining Game..."
                : "Submitting..."
              : "Submit Move"}
          </button>
        </div>
      </div>
    </div>
  );
}

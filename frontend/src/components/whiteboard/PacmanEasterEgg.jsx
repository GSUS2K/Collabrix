export default function PacmanEasterEgg({ onClose }) {
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]"
            onClick={onClose}
        >
            <div
                className="relative bg-black border-2 border-brand-yellow/50 rounded-3xl shadow-[0_0_60px_rgba(255,217,61,0.4)] overflow-hidden animate-[slideInUp_0.4s_cubic-bezier(0.34,1.56,0.64,1)]"
                style={{ width: 600, height: 520 }}
                onClick={e => e.stopPropagation()}
            >
                {}
                <div className="flex items-center justify-between px-5 py-3 bg-black border-b border-brand-yellow/20">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl animate-[pulse_0.8s_steps(1)_infinite]">👾</span>
                        <div>
                            <p className="text-brand-yellow font-display font-black text-lg tracking-widest">PAC-MAN</p>
                            <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold">🕵️ Secret Unlocked — You found it!</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all text-xl"
                    >
                        ×
                    </button>
                </div>

                {}
                <iframe
                    src="https://freepacman.org/"
                    title="Pac-Man Easter Egg"
                    className="w-full"
                    style={{ height: 'calc(100% - 56px)', border: 'none', background: '#000' }}
                    allow="autoplay"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                />
            </div>

            {}
            <p className="absolute bottom-6 text-white/25 text-xs font-medium tracking-wider animate-[pulse_3s_infinite]">
                Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/40 text-[10px] font-mono border border-white/10">Esc</kbd> or click outside to close
            </p>
        </div>
    );
}

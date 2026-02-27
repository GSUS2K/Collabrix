import React, { useEffect, useState } from 'react';

const AMOUNTS = [
    { label: '☕ Small sip', cups: 1, usd: 1 },
    { label: '☕☕ Regular', cups: 3, usd: 3 },
    { label: '🥤 Cold brew', cups: 5, usd: 5 },
];

const DonationModal = ({ isOpen, onClose }) => {
    const [selected, setSelected] = useState(1); // default $3
    const [custom, setCustom] = useState('');
    const [animOut, setAnimOut] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setAnimOut(false);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleClose = () => {
        setAnimOut(true);
        setTimeout(onClose, 220);
    };

    const finalAmount = custom ? parseFloat(custom) || 0 : AMOUNTS[selected].usd;

    const handleDonate = () => {
        // BMaC supports prefilling amount via /support URL
        const url = `https://www.buymeacoffee.com/gsus2k`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                onClick={handleClose}
            />

            {/* Modal */}
            <div
                className={`relative w-full max-w-[400px] rounded-3xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col
          ${animOut ? 'animate-[slideOutDown_0.22s_ease-in_forwards]' : 'animate-[slideInUp_0.35s_cubic-bezier(0.16,1,0.3,1)]'}`}
                style={{ background: 'linear-gradient(160deg, #12141a 0%, #0d0f14 100%)' }}
            >
                {/* Top gradient line */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00FFBF]/40 to-transparent" />

                {/* Close */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-10 p-1.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-full border border-white/10 transition-all hover:scale-110"
                    aria-label="Close"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                <div className="px-8 pt-9 pb-6 flex flex-col items-center border-b border-white/[0.06]">
                    <div className="w-16 h-16 rounded-2xl bg-[#00FFBF]/10 border border-[#00FFBF]/20 flex items-center justify-center text-3xl mb-4
              shadow-[0_0_30px_rgba(0,255,191,0.15)] animate-[pulse_3s_ease-in-out_infinite]">
                        🥤
                    </div>
                    <h3 className="text-[22px] font-black text-white mb-2 tracking-tight">Buy me a cold coffee?</h3>
                    <p className="text-white/50 text-[13px] leading-relaxed text-center max-w-[280px]">
                        Hope Collabrix was a fun experience! If you'd like to keep the servers running, I'd love a cold coffee ❄️
                    </p>
                </div>

                {/* Amount Picker */}
                <div className="px-8 py-6 flex flex-col gap-4">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Pick an amount</p>

                    <div className="grid grid-cols-3 gap-2">
                        {AMOUNTS.map(({ label, cups, usd }, i) => (
                            <button
                                key={i}
                                onClick={() => { setSelected(i); setCustom(''); }}
                                className={`flex flex-col items-center gap-1 p-3 rounded-2xl border text-center transition-all hover:scale-105
                  ${selected === i && !custom
                                        ? 'bg-[#00FFBF]/10 border-[#00FFBF]/40 shadow-[0_0_20px_rgba(0,255,191,0.12)]'
                                        : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/20'
                                    }`}
                            >
                                <span className="text-xl">{label.split(' ')[0]}</span>
                                <span className={`text-[11px] font-black ${selected === i && !custom ? 'text-[#00FFBF]' : 'text-white/50'}`}>
                                    ${usd}
                                </span>
                                <span className="text-[9px] text-white/30 uppercase tracking-wide">{label.split(' ').slice(1).join(' ')}</span>
                            </button>
                        ))}
                    </div>

                    {/* Custom Amount */}
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-bold">$</span>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="Custom amount..."
                            value={custom}
                            onChange={e => { setCustom(e.target.value); setSelected(-1); }}
                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder-white/20
                focus:outline-none focus:border-[#00FFBF]/50 focus:ring-1 focus:ring-[#00FFBF]/30 transition-all hover:border-white/20"
                        />
                    </div>

                    {/* CTA */}
                    <button
                        onClick={handleDonate}
                        disabled={finalAmount <= 0}
                        className="w-full bg-[#00FFBF] hover:bg-[#00e6ab] text-[#0d0f14] font-black text-sm py-4 rounded-2xl
              transition-all hover:shadow-[0_0_30px_rgba(0,255,191,0.4)] hover:scale-[1.02] active:scale-95
              disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
                    >
                        <span>🥤</span>
                        Back you with {finalAmount > 0 ? `$${finalAmount}` : '...'}
                        <span className="text-base">→</span>
                    </button>

                    <p className="text-center text-[10px] text-white/20">
                        Opens Buy Me a Coffee securely in a new tab
                    </p>
                </div>

                {/* Bottom gradient line */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </div>

            <style>{`
        @keyframes slideOutDown {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(30px) scale(0.97); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(30px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
        </div>
    );
};

export default DonationModal;

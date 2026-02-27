import React, { useEffect, useState } from 'react';

const DonationModal = ({ isOpen, onClose }) => {
    const [isIframeLoaded, setIsIframeLoaded] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setIsIframeLoaded(false);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-[fadeIn_0.2s_ease-out]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-[420px] bg-[#1a1c23] border border-white/10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col transform transition-all animate-[slideInUp_0.4s_cubic-bezier(0.16,1,0.3,1)]">

                {/* Header Ribbon / Close */}
                <div className="absolute top-4 right-4 z-10">
                    <button
                        onClick={onClose}
                        className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white/60 hover:text-white rounded-full transition-all border border-white/10 shadow-lg hover:scale-110 active:scale-95"
                        aria-label="Close"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Custom Friendly Message Header */}
                <div className="pt-10 pb-6 px-8 bg-gradient-to-b from-brand-accent/5 to-transparent flex flex-col items-center border-b border-white/5 relative">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-accent/30 to-transparent opacity-50" />

                    <div className="w-16 h-16 rounded-full bg-brand-accent/10 flex items-center justify-center text-3xl mb-4 border border-brand-accent/20 shadow-[0_0_20px_rgba(0,255,191,0.1)]">
                        🥤
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 text-center">
                        Enjoyed Collabrix?
                    </h3>
                    <p className="text-white/70 text-[14px] leading-relaxed text-center font-medium opacity-90">
                        Hope the website was a fun experience! ✨<br />
                        If you'd like to support the project and help keep the servers running smoothly, consider grabbing me a cold coffee!
                    </p>
                </div>

                {/* BMAC Iframe Container */}
                <div className="relative w-full h-[450px] bg-white flex items-center justify-center overflow-hidden">
                    {!isIframeLoaded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#1a1c23]">
                            <div className="w-8 h-8 flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-white/40 text-xs font-bold tracking-widest uppercase">Loading Widget...</span>
                        </div>
                    )}

                    <iframe
                        src="https://buymeacoffee.com/widget/page/gsus2k?description=Support%20me%20on%20Buy%20me%20a%20coffee!&color=%2300FFBF"
                        className={`w-full h-full border-none transition-opacity duration-500 will-change-opacity ${isIframeLoaded ? 'opacity-100' : 'opacity-0'}`}
                        onLoad={() => setIsIframeLoaded(true)}
                        title="Buy Me a Coffee Widget"
                    />
                </div>
            </div>
        </div>
    );
};

export default DonationModal;

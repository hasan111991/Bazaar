import React, { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

export const WhatsAppButton: React.FC = () => {
  const { settings } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState('');

  const phone = settings.whatsappNumber ? settings.whatsappNumber.replace(/[^0-9]/g, '') : '923001234567';

  const sendWhatsApp = (msgText?: string) => {
    const text = encodeURIComponent(
      msgText ||
        `Assalam-o-Alaikum ${settings.siteName} Support, I would like to inquire about placing an order or tracking my delivery.`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 no-print">
      {isOpen && (
        <div className="mb-3 w-[calc(100vw-2rem)] max-w-xs bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-slide-up">
          <div className="bg-[#25D366] text-white p-3.5 sm:p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-base shrink-0">
                {(settings.siteName || 'B')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs sm:text-sm leading-tight truncate">
                  {settings.siteName} WhatsApp Support
                </h4>
                <p className="text-[11px] text-white/90 truncate">Direct customer desk (9AM - 11PM PKT)</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 shrink-0"
              aria-label="Close WhatsApp Chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3.5 sm:p-4 bg-slate-50 space-y-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-700 shadow-2xs">
              <p className="font-medium text-slate-800 mb-1">Salam! How can we assist you today?</p>
              <p className="text-slate-500 text-[11px]">
                Click below to start a WhatsApp chat with our {settings.city || 'store'} support team.
              </p>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => sendWhatsApp('Salam! I need help with my recent order delivery.')}
                className="w-full text-left text-xs bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 p-2 rounded-lg text-slate-700 transition"
              >
                Inquire about order status & courier tracking
              </button>
              <button
                type="button"
                onClick={() => sendWhatsApp('Salam! I have a question about size and product availability.')}
                className="w-full text-left text-xs bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 p-2 rounded-lg text-slate-700 transition"
              >
                Product availability & specifications
              </button>
              <button
                type="button"
                onClick={() => sendWhatsApp('Salam! I want to pay via EasyPaisa, JazzCash, or Bank Transfer.')}
                className="w-full text-left text-xs bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 p-2 rounded-lg text-slate-700 transition"
              >
                EasyPaisa, JazzCash & Bank Transfer help
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Type your question..."
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendWhatsApp(customMsg);
                }}
                className="flex-1 min-w-0 text-xs px-3 py-2 bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#25D366]"
              />
              <button
                onClick={() => sendWhatsApp(customMsg)}
                className="p-2 bg-[#25D366] hover:bg-[#1ebd5b] text-white rounded-xl transition shadow-xs shrink-0"
                aria-label="Send WhatsApp Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        aria-label="WhatsApp Support"
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5 fill-white text-transparent" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-300 rounded-full animate-ping" />
        </div>
        <span className="text-xs font-bold tracking-wide">
          {isOpen ? 'Close' : 'WhatsApp'}
          <span className="hidden sm:inline"> Support</span>
        </span>
      </button>
    </div>
  );
};

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useToast } from '../components/common/Toast';
import { saveShopContactMessage } from '../services/tenantService';

export const ContactPage: React.FC = () => {
  const { shopId, settings } = useTenant();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      showToast('Please fill in your name, email, and message.', 'error');
      return;
    }

    setLoading(true);
    try {
      await saveShopContactMessage(shopId, {
        name,
        email,
        phone,
        subject,
        message,
      });
      showToast(`Thank you! Your message has been sent to ${settings.siteName}.`, 'success');
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch {
      showToast('Could not submit message right now. Please reach us on WhatsApp.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const ph = settings.whatsappNumber.replace(/[^0-9]/g, '');
    window.open(
      `https://wa.me/${ph}?text=Salam!%20I%20need%20help%20with%20an%20order%20from%20${encodeURIComponent(settings.siteName)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 space-y-10 sm:space-y-12">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
          {settings.siteName} Support
        </span>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900">
          We're Here to Help
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Have questions about product availability, parcel dispatch, self-pickup, or EasyPaisa/JazzCash payments? Message our team.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="space-y-4">
          <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Direct Phone & WhatsApp</h4>
            <p className="text-xs text-slate-500">Call us or message on WhatsApp for instant assistance.</p>
            <p className="font-bold text-emerald-800 text-sm">{settings.contactPhone}</p>
            <button
              onClick={handleWhatsApp}
              className="w-full py-2.5 px-3 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
            >
              <MessageSquare className="w-4 h-4" /> Chat on WhatsApp
            </button>
          </div>

          <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Email Inquiries</h4>
            <p className="text-xs text-slate-500">Drop an email for order tracking or bulk requests.</p>
            <p className="font-bold text-slate-900 text-xs break-all">{settings.contactEmail}</p>
          </div>

          <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Store & Self-Pickup Outlet</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{settings.address}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
              <Clock className="w-3.5 h-3.5 text-emerald-700" /> {settings.selfPickupDetails?.timings || 'Mon - Sat: 11 AM - 9 PM PKT'}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-5 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
          <h3 className="font-bold text-lg text-slate-900 mb-1">Send Us a Direct Message</h3>
          <p className="text-xs text-slate-500 mb-6">
            Fill out the inquiry form and our representative at {settings.siteName} will respond promptly.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bilal Haider"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pakistani Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="0300 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="Order Inquiry / Size Guidance"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Your Message *</label>
              <textarea
                required
                rows={5}
                placeholder="How can we help you? Include your Order Number if this is regarding an active shipment..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto py-3 px-6 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> {loading ? 'Sending Message...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// app/organizer/[id]/OrganizerProfileClient.tsx
'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import {
  MapPin,
  Globe,
  Mail,
  MessageSquare,
  CheckCircle,
  Edit3,
  Bell,
  CreditCard,
  Users,
  Image as ImageIcon,
  Eye,
  AlertTriangle,
  ChevronRight,
  Calendar,
  TrendingUp,
  DollarSign,
  Star,
  UserCheck,
  Building2,
  Phone,
  Link as LinkIcon,
  Shield,
  Award,
  Clock,
  FileText,
  Settings,
  Trash2,
  Power,
  Plus,
  X,
} from 'lucide-react';

import { 
  FaFacebook, 
  FaInstagram, 
  FaLinkedin, 
  FaXTwitter 
} from 'react-icons/fa6';

import { EventModel } from '@/src/services/models/event.model';
import { IOrganizer,INotificationPreferences,IDefaultEventSettings,IVerificationDetails } from '@/src/services/models/organizer.interfaces';

// ─── Props Interface ───
interface OrganizerProfileClientProps {
  organizer: IOrganizer;
  events: EventModel[];
}

// ─── Tab Type ───
type TabType = 'upcoming' | 'past' | 'about';

// ─── Reusable Card Component ───
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card = ({ children, className = '' }: CardProps): React.ReactElement => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 ${className}`}>
    {children}
  </div>
);

// ─── Section Title Component ───
interface SectionTitleProps {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  action?: React.ReactNode;
}

const SectionTitle = ({ icon: Icon, title, action }: SectionTitleProps): React.ReactElement => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-2 text-gray-900 font-semibold">
      {Icon && <Icon size={18} className="text-gray-500" />}
      <h2>{title}</h2>
    </div>
    {action}
  </div>
);

// ─── Toggle Switch Component ───
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

const ToggleSwitch = ({ enabled, onChange }: ToggleSwitchProps): React.ReactElement => (
  <button
    type="button"
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ${
      enabled ? 'bg-black' : 'bg-gray-200'
    }`}
    aria-pressed={enabled}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

// ─── Input Field Component ───
interface InputFieldProps {
  label: string;
  value: string;
  type?: string;
  readOnly?: boolean;
}

const InputField = ({ label, value, type = 'text', readOnly = false }: InputFieldProps): React.ReactElement => (
  <div className="mb-4">
    <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
    <input
      type={type}
      defaultValue={value}
      readOnly={readOnly}
      className={`w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all ${
        readOnly ? 'bg-gray-50' : 'bg-white'
      }`}
    />
  </div>
);

// ─── Stat Card Component ───
interface StatCardProps {
  value: string | number;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const StatCard = ({ value, label, icon: Icon }: StatCardProps): React.ReactElement => (
  <div className="bg-gray-50 p-3 rounded-xl text-center">
    <Icon size={20} className="mx-auto mb-1 text-gray-400" />
    <div className="text-xl font-bold">{value}</div>
    <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">{label}</div>
  </div>
);

// ─── Social Icon Mapper ───
const SocialIcon = ({ platform }: { platform: string }): React.ReactElement | null => {
  const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    facebook: FaFacebook,
    instagram: FaInstagram,
    linkedin: FaLinkedin,
    twitter: FaXTwitter,
  };

  const Icon = icons[platform.toLowerCase()];
  if (!Icon) return null;

  return (
    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 cursor-pointer transition-colors">
      <Icon size={16} className="text-gray-600" />
    </div>
  );
};

// ─── Verification Badge Color Mapper ───
const getVerificationColor = (level: string): string => {
  const colors: Record<string, string> = {
    bronze: 'bg-amber-700',
    silver: 'bg-gray-400',
    gold: 'bg-yellow-500',
    platinum: 'bg-purple-600',
  };
  return colors[level] || 'bg-gray-400';
};

// ─── Main Component ───
export default function OrganizerProfileClient({
  organizer,
  events,
}: OrganizerProfileClientProps): React.ReactElement {
  // ─── State ───
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [notifications, setNotifications] = useState(organizer.settings.notificationPreferences);
  const [privacy, setPrivacy] = useState({ publicProfile: true }); // Extend from organizer if available
  const [twoFactor, setTwoFactor] = useState(false); // From auth service in real app

  // ─── Derived Data ───
  const upcomingEvents = events.filter((e) => e.status === 'published' && new Date(e.schedule.startDate) > new Date());
  const pastEvents = events.filter((e) => e.status === 'completed' || new Date(e.schedule.endDate) < new Date());
  
  const displayEvents = activeTab === 'upcoming' ? upcomingEvents : activeTab === 'past' ? pastEvents : [];

  const stats = organizer.eventStats;

  // ─── Handlers ───
  const handleNotificationToggle = useCallback((key: keyof INotificationPreferences) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // ─── Render ───
  return (
    <div className="min-h-screen bg-[#F8F9FB] text-gray-900 font-sans pb-20">
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ════════════════════════════════════════
            LEFT COLUMN: Profile Sidebar
            ════════════════════════════════════════ */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* ── Profile Header Card ── */}
          <Card className="relative overflow-hidden">
            {/* Cover Image */}
            <div className="h-32 bg-gradient-to-r from-gray-100 to-gray-200 -mx-6 -mt-6 mb-12 relative">
              {organizer.organization.coverImage ? (
                <Image
                  src={organizer.organization.coverImage}
                  alt="Cover"
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
              )}
            </div>
            
            {/* Avatar */}
            <div className="absolute top-16 left-6">
              <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-md overflow-hidden">
                {organizer.organization.logo ? (
                  <Image
                    src={organizer.organization.logo}
                    alt={organizer.organization.name}
                    width={80}
                    height={80}
                    className="object-cover"
                  />
                ) : (
                  organizer.organization.name.charAt(0).toUpperCase()
                )}
              </div>
            </div>

            <div className="mt-2">
              {/* Name & Verification */}
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{organizer.organization.name}</h1>
                {organizer.verification.isVerified && (
                  <div className="flex items-center gap-1" title={`${organizer.verification.verificationLevel} verified`}>
                    <CheckCircle size={18} className="text-blue-500 fill-blue-500 text-white" />
                    <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full uppercase ${getVerificationColor(organizer.verification.verificationLevel)}`}>
                      {organizer.verification.verificationLevel}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-gray-500 text-sm mb-1">{organizer.organization.type}</p>
              
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                {organizer.organization.description}
              </p>

              {/* Contact Info */}
              <div className="space-y-2 text-sm text-gray-500 mb-6">
                <div className="flex items-center gap-2">
                  <MapPin size={16} />
                  <span>{`${organizer.address.city}, ${organizer.address.country}`}</span>
                </div>
                {organizer.contact.website && (
                  <div className="flex items-center gap-2">
                    <Globe size={16} />
                    <a
                      href={organizer.contact.website.startsWith('http') ? organizer.contact.website : `https://${organizer.contact.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-blue-600"
                    >
                      {organizer.contact.website}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  <span>{organizer.contact.primaryEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={16} />
                  <span>{organizer.contact.primaryPhone}</span>
                </div>

                {/* Social Links */}
                <div className="flex gap-2 mt-3">
                  {Object.entries(organizer.contact.socialMedia)
                    .filter(([, url]) => url)
                    .map(([platform]) => (
                      <SocialIcon key={platform} platform={platform} />
                    ))}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <StatCard value={stats.totalEventsCreated} label="Events Created" icon={Calendar} />
                <StatCard value={stats.totalAttendees.toLocaleString()} label="Attendees" icon={Users} />
                <StatCard value={stats.averageRating.toFixed(1)} label="Avg Rating" icon={Star} />
                <StatCard value={formatCurrency(stats.totalRevenue)} label="Revenue" icon={DollarSign} />
              </div>

              {/* Action Buttons */}
              <button className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors mb-3">
                Follow
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 border border-gray-200 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  <MessageSquare size={16} /> Message
                </button>
                <button className="flex items-center justify-center gap-2 border border-gray-200 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  <Mail size={16} /> Email
                </button>
              </div>
            </div>
          </Card>

          {/* ── Events Tabs ── */}
          <Card>
            <div className="flex border-b border-gray-100 mb-4">
              {(['upcoming', 'past', 'about'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2 px-3 text-sm font-medium transition-colors relative capitalize ${
                    activeTab === tab ? 'text-black' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab === 'upcoming' ? 'Upcoming Events' : tab === 'past' ? 'Past Events' : 'About'}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {activeTab === 'about' ? (
                <div className="space-y-4 text-sm text-gray-600">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Organization Details</h4>
                    <p>Type: <span className="capitalize">{organizer.organization.type}</span></p>
                    <p>Established: {organizer.organization.establishedYear}</p>
                    {organizer.organization.registrationNumber && (
                      <p>Reg #: {organizer.organization.registrationNumber}</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Address</h4>
                    <p>{organizer.address.officeAddress}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Plan</h4>
                    <p className="capitalize">{organizer.plan.type} Plan</p>
                    <p className="text-xs text-gray-400">
                      Expires: {formatDate(organizer.plan.expiresAt)}
                      {organizer.plan.autoRenew && ' (Auto-renew)'}
                    </p>
                  </div>
                </div>
              ) : displayEvents.length > 0 ? (
                displayEvents.map((event) => (
                  <div key={event.id} className="group cursor-pointer">
                    <div className="relative h-40 rounded-xl overflow-hidden mb-3">
                      {event.bannerImage ? (
                        <Image
                          src={event.bannerImage}
                          alt={event.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <ImageIcon size={32} className="text-gray-400" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold uppercase">
                        {new Date(event.schedule.startDate).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(new Date(event.schedule.startDate))} • {event.location.address}, {event.location.city}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{event.category}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No {activeTab} events found.</p>
              )}
            </div>
          </Card>
        </div>

        {/* ════════════════════════════════════════
            RIGHT COLUMN: Settings & Details
            ════════════════════════════════════════ */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* ── Quick Stats Bar ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Calendar size={20} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-lg font-bold">{stats.upcomingEvents}</div>
                  <div className="text-xs text-gray-500">Upcoming</div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <div>
                  <div className="text-lg font-bold">{stats.completedEvents}</div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <TrendingUp size={20} className="text-purple-600" />
                </div>
                <div>
                  <div className="text-lg font-bold">{stats.publishedEvents}</div>
                  <div className="text-xs text-gray-500">Published</div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Star size={20} className="text-orange-600" />
                </div>
                <div>
                  <div className="text-lg font-bold">{stats.averageAttendeesPerEvent}</div>
                  <div className="text-xs text-gray-500">Avg/Event</div>
                </div>
              </div>
            </Card>
          </div>

          {/* ── Account Settings ── */}
          <Card>
            <SectionTitle icon={CheckCircle} title="Account Settings" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <InputField label="Email Address" value={organizer.contact.primaryEmail} />
              <div className="relative">
                <InputField label="Phone Number" value={organizer.contact.primaryPhone} />
                <span className="absolute top-9 right-3 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                  VERIFIED
                </span>
              </div>
            </div>
            {organizer.contact.secondaryPhone && (
              <InputField label="Secondary Phone" value={organizer.contact.secondaryPhone} />
            )}
            
            <div className="flex items-center justify-between mt-2 py-3 border-t border-gray-100">
              <div>
                <h3 className="text-sm font-medium">Two-Factor Authentication</h3>
                <p className="text-xs text-gray-500">Add an extra layer of security to your account.</p>
              </div>
              <ToggleSwitch enabled={twoFactor} onChange={setTwoFactor} />
            </div>
            
            {/* <div className="mt-2">
              <button
                type="button"
                className="text-sm text-gray-600 hover:text-black font-medium flex items-center gap-1 transition-colors"
              >
                Change Password
              </button>
            </div> */}
          </Card>

          {/* ── Organization Settings ── */}
          <Card>
            <SectionTitle icon={Building2} title="Organization Settings" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <InputField label="Organization Name" value={organizer.organization.name} />
              <div className="relative">
                <InputField
                  label="Tax Identification"
                  value={organizer.organization.taxNumber || 'N/A'}
                  readOnly={!organizer.organization.taxNumber}
                />
                {organizer.organization.taxNumber && (
                  <CheckCircle size={16} className="absolute top-9 right-3 text-green-500" />
                )}
              </div>
            </div>
            <InputField label="Business Registration Address" value={organizer.address.officeAddress} />
            <InputField label="City" value={organizer.address.city} />
            <InputField label="Country" value={organizer.address.country} />
           
          </Card>
        

          {/* ── Verification Status ── */}
          <Card>
            <SectionTitle icon={Shield} title="Verification Status" />
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Award size={24} className={organizer.verification.isVerified ? 'text-green-500' : 'text-gray-400'} />
                <div>
                  <h3 className="text-sm font-medium">
                    {organizer.verification.isVerified ? 'Verified Organizer' : 'Unverified'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Level: <span className="capitalize font-semibold">{organizer.verification.verificationLevel}</span>
                    {organizer.verification.verifiedAt && ` • ${formatDate(organizer.verification.verifiedAt)}`}
                  </p>
                </div>
              </div>
              
              {organizer.verification.badges.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Badges</label>
                  <div className="flex flex-wrap gap-2">
                    {organizer.verification.badges.map((badge) => (
                      <span key={badge} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Documents</label>
                <div className="space-y-2">
                  {organizer.verification.documents.businessRegistration && (
                    <div className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                      <span className="flex items-center gap-2"><FileText size={14} /> Business Registration</span>
                      <CheckCircle size={14} className="text-green-500" />
                    </div>
                  )}
                  {organizer.verification.documents.taxCertificate && (
                    <div className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                      <span className="flex items-center gap-2"><FileText size={14} /> Tax Certificate</span>
                      <CheckCircle size={14} className="text-green-500" />
                    </div>
                  )}
                  {organizer.verification.documents.identityProof && (
                    <div className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                      <span className="flex items-center gap-2"><FileText size={14} /> Identity Proof</span>
                      <CheckCircle size={14} className="text-green-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>



          {/* ── Privacy ── */}
          {/* <Card>
            <SectionTitle icon={Eye} title="Privacy" />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Public Profile Visibility</h3>
                <p className="text-xs text-gray-500">Allow visitors to view your organization page and events.</p>
              </div>
              <ToggleSwitch
                enabled={privacy.publicProfile}
                onChange={(val) => setPrivacy({ ...privacy, publicProfile: val })}
              />
            </div>
          </Card> */}

          {/* ── Subscription Plan ── */}
          <Card>
            <SectionTitle icon={Award} title="Subscription Plan" />
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold capitalize">{organizer.plan.type} Plan</h3>
                <p className="text-xs text-gray-500">
                  Expires {formatDate(organizer.plan.expiresAt)}
                  {organizer.plan.autoRenew && ' • Auto-renew enabled'}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                organizer.plan.type === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                organizer.plan.type === 'pro' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {organizer.plan.type}
              </span>
            </div>
            <div className="space-y-2">
              {organizer.plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle size={14} className="text-green-500" />
                  {feature}
                </div>
              ))}
            </div>
          </Card>

          {/* ── Danger Zone ── */}
          {/* <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <AlertTriangle size={18} />
              <h2 className="font-semibold">Danger Zone</h2>
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Deactivate Account</h3>
                <p className="text-xs text-gray-500">Temporarily disable your account and hide your profile.</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button
                  type="button"
                  className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Power size={14} /> Deactivate
                </button>
                <button
                  type="button"
                  className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Delete Account
                </button>
              </div>
            </div>
          </div> */}

        </div>
      </div>
      
      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 w-full bg-[#1a1a1a] text-white p-4 flex justify-around items-center md:hidden z-50 rounded-t-2xl">
        <div className="w-8 h-8 flex items-center justify-center opacity-50"><Globe size={20}/></div>
        <div className="w-8 h-8 flex items-center justify-center opacity-50"><MessageSquare size={20}/></div>
        <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center -mt-8 border-4 border-[#F8F9FB]"><Edit3 size={20}/></div>
        <div className="w-8 h-8 flex items-center justify-center opacity-50"><Users size={20}/></div>
        <div className="w-8 h-8 flex items-center justify-center opacity-50"><ImageIcon size={20}/></div>
      </div>
    </div>
  );
}
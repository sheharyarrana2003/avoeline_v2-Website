// "use client"
// import React, { useState } from 'react';
// import Head from 'next/head';
// import { 
//   MapPin, 
//   Globe, 
//   Mail, 
//   MessageSquare, 
//   CheckCircle, 
//   Edit3, 
//   Bell, 
//   CreditCard, 
//   Users, 
//   Image as ImageIcon, 
//   Eye, 
//   AlertTriangle, 
//   ChevronRight,
//   ToggleLeft,
//   ToggleRight,
//   X
// } from 'lucide-react';
// import { usePathname } from 'next/navigation';

// // --- Mock Data ---
// const ORGANIZER_DATA = {
//   id: 'techverse-001',
//   name: 'TechVerse',
//   handle: '@techverse',
//   verified: true,
//   description: 'Leading event management platform specializing in cutting-edge technology conferences, developer workshops, and innovation summits across Asia.',
//   location: 'Karachi, Pakistan',
//   website: 'www.techverse.pk',
//   stats: {
//     eventsHosted: 24,
//     attendees: '12.5K',
//     avgRating: 4.8,
//     followers: '2.5K'
//   },
//   events: [
//     {
//       id: 1,
//       title: 'Web3 Developers Summit 2024',
//       date: 'Oct 24 • Expo Center, Karachi',
//       image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800'
//     },
//     {
//       id: 2,
//       title: 'Cybersecurity Workshop',
//       date: 'Nov 12 • Digital Hub',
//       image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800'
//     }
//   ],
//   account: {
//     email: 'contact@techverse.pk',
//     phone: '+92 300 1234567',
//     twoFactor: true
//   },
//   organization: {
//     name: 'TechVerse Events Ltd.',
//     taxId: 'NTN 82910-3',
//     address: 'Floor 4, Innovation Tower, Main Shahrah-e-Faisal, Karachi, Pakistan',
//     bank: 'Habib Bank Limited, **** 9201'
//   },
//   notifications: {
//     newAttendee: true,
//     sponsorship: true,
//     payment: true,
//     reviews: false
//   },
//   payments: {
//     currency: 'PKR - Pakistani Rupee',
//     schedule: 'Weekly (Mondays)',
//     methods: ['Credit/Debit Cards', 'JazzCash', 'EasyPaisa']
//   },
//   team: [
//     { id: 1, name: 'Sarah Jenkins', email: 'sarah@techverse.pk', role: 'Owner', avatar: 'https://i.pravatar.cc/150?u=sarah' },
//     { id: 2, name: 'Ali Raza', email: 'ali@techverse.pk', role: 'Co-organizer', avatar: 'https://i.pravatar.cc/150?u=ali' },
//     { id: 3, name: 'Fatima Zahra', email: 'fatima@techverse.pk', role: 'Volunteer', avatar: 'https://i.pravatar.cc/150?u=fatima' }
//   ],
//   branding: {
//     logo: 'TV',
//     cover: null
//   },
//   privacy: {
//     publicProfile: true
//   }
// };

// // --- Reusable Components ---

// const Card = ({ children, className = '' }) => (
//   <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 ${className}`}>
//     {children}
//   </div>
// );

// const SectionTitle = ({ icon: Icon, title, action }) => (
//   <div className="flex items-center justify-between mb-6">
//     <div className="flex items-center gap-2 text-gray-900 font-semibold">
//       {Icon && <Icon size={18} className="text-gray-500" />}
//       <h2>{title}</h2>
//     </div>
//     {action}
//   </div>
// );

// const ToggleSwitch = ({ enabled, onChange }) => (
//   <button
//     onClick={() => onChange(!enabled)}
//     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
//       enabled ? 'bg-black' : 'bg-gray-200'
//     }`}
//   >
//     <span
//       className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
//         enabled ? 'translate-x-6' : 'translate-x-1'
//       }`}
//     />
//   </button>
// );

// const InputField = ({ label, value, type = "text", readOnly = false }) => (
//   <div className="mb-4">
//     <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
//     <input
//       type={type}
//       defaultValue={value}
//       readOnly={readOnly}
//       className={`w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all ${readOnly ? 'bg-gray-50' : 'bg-white'}`}
//     />
//   </div>
// );

// // --- Main Page Component ---

// export default function OrganizerProfile() {
//     const organizer_id = usePathname();

//   // State for interactive elements
//   const [twoFactor, setTwoFactor] = useState(ORGANIZER_DATA.account.twoFactor);
//   const [notifications, setNotifications] = useState(ORGANIZER_DATA.notifications);
//   const [privacy, setPrivacy] = useState(ORGANIZER_DATA.privacy);
//   const [activeTab, setActiveTab] = useState('Upcoming Events');

//   const handleNotificationToggle = (key) => {
//     setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
//   };

//   return (
//     <div className="min-h-screen bg-[#F8F9FB] text-gray-900 font-sans pb-20">
//       <Head>
//         <title>{ORGANIZER_DATA.name} - Organizer Profile</title>
//       </Head>

//       <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
//         {/* LEFT COLUMN: Profile Sidebar */}
//         <div className="lg:col-span-4 space-y-6">
          
//           {/* Profile Header Card */}
//           <Card className="relative overflow-hidden">
//             {/* Cover Image */}
//             <div className="h-32 bg-gradient-to-r from-gray-100 to-gray-200 -mx-6 -mt-6 mb-12 relative">
//               <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
//             </div>
            
//             {/* Avatar */}
//             <div className="absolute top-16 left-6">
//               <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-md">
//                 {ORGANIZER_DATA.branding.logo}
//               </div>
//             </div>

//             <div className="mt-2">
//               <div className="flex items-center gap-2">
//                 <h1 className="text-2xl font-bold">{ORGANIZER_DATA.name}</h1>
//                 {ORGANIZER_DATA.verified && <CheckCircle size={18} className="text-blue-500 fill-blue-500 text-white" />}
//               </div>
//               <p className="text-gray-500 text-sm mb-4">{ORGANIZER_DATA.handle}</p>
              
//               <p className="text-gray-600 text-sm leading-relaxed mb-4">
//                 {ORGANIZER_DATA.description}
//               </p>

//               <div className="space-y-2 text-sm text-gray-500 mb-6">
//                 <div className="flex items-center gap-2">
//                   <MapPin size={16} />
//                   <span>{ORGANIZER_DATA.location}</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <Globe size={16} />
//                   <a href="#" className="hover:underline">{ORGANIZER_DATA.website}</a>
//                 </div>
//                 <div className="flex gap-3 mt-2">
//                    {/* Social Placeholders */}
//                    <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 cursor-pointer"><span className="font-bold text-xs">in</span></div>
//                    <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 cursor-pointer"><span className="font-bold text-xs">@</span></div>
//                    <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 cursor-pointer"><span className="font-bold text-xs">x</span></div>
//                 </div>
//               </div>

//               {/* Stats Grid */}
//               <div className="grid grid-cols-2 gap-4 mb-6">
//                 <div className="bg-gray-50 p-3 rounded-xl text-center">
//                   <div className="text-xl font-bold">{ORGANIZER_DATA.stats.eventsHosted}</div>
//                   <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Events Hosted</div>
//                 </div>
//                 <div className="bg-gray-50 p-3 rounded-xl text-center">
//                   <div className="text-xl font-bold">{ORGANIZER_DATA.stats.attendees}</div>
//                   <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Attendees</div>
//                 </div>
//                 <div className="bg-gray-50 p-3 rounded-xl text-center">
//                   <div className="text-xl font-bold">{ORGANIZER_DATA.stats.avgRating}</div>
//                   <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Avg Rating</div>
//                 </div>
//                 <div className="bg-gray-50 p-3 rounded-xl text-center">
//                   <div className="text-xl font-bold">{ORGANIZER_DATA.stats.followers}</div>
//                   <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Followers</div>
//                 </div>
//               </div>

//               <button className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors mb-3">
//                 Follow
//               </button>
              
//               <div className="grid grid-cols-2 gap-3">
//                 <button className="flex items-center justify-center gap-2 border border-gray-200 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
//                   <MessageSquare size={16} /> Message
//                 </button>
//                 <button className="flex items-center justify-center gap-2 border border-gray-200 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
//                   <Mail size={16} /> Email
//                 </button>
//               </div>
//             </div>
//           </Card>

//           {/* Events Tabs */}
//           <Card>
//             <div className="flex border-b border-gray-100 mb-4">
//               {['Upcoming Events', 'Past Events', 'About'].map((tab) => (
//                 <button
//                   key={tab}
//                   onClick={() => setActiveTab(tab)}
//                   className={`pb-2 px-3 text-sm font-medium transition-colors relative ${
//                     activeTab === tab ? 'text-black' : 'text-gray-400 hover:text-gray-600'
//                   }`}
//                 >
//                   {tab}
//                   {activeTab === tab && (
//                     <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-full" />
//                   )}
//                 </button>
//               ))}
//             </div>

//             <div className="space-y-4">
//               {ORGANIZER_DATA.events.map((event) => (
//                 <div key={event.id} className="group cursor-pointer">
//                   <div className="relative h-40 rounded-xl overflow-hidden mb-3">
//                     <img 
//                       src={event.image} 
//                       alt={event.title} 
//                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
//                     />
//                     <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold">
//                       OCT
//                     </div>
//                   </div>
//                   <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{event.title}</h3>
//                   <p className="text-xs text-gray-500 mt-1">{event.date}</p>
//                 </div>
//               ))}
//             </div>
//           </Card>
//         </div>

//         {/* RIGHT COLUMN: Settings */}
//         <div className="lg:col-span-8 space-y-6">
          
//           {/* Account Settings */}
//           <Card>
//             <SectionTitle icon={CheckCircle} title="Account Settings" />
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
//               <InputField label="Email Address" value={ORGANIZER_DATA.account.email} />
//               <div className="relative">
//                 <InputField label="Phone Number" value={ORGANIZER_DATA.account.phone} />
//                 <span className="absolute top-9 right-3 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">VERIFIED</span>
//               </div>
//             </div>
            
//             <div className="flex items-center justify-between mt-2 py-3 border-t border-gray-100">
//               <div>
//                 <h3 className="text-sm font-medium">Two-Factor Authentication</h3>
//                 <p className="text-xs text-gray-500">Add an extra layer of security to your account.</p>
//               </div>
//               <ToggleSwitch enabled={twoFactor} onChange={setTwoFactor} />
//             </div>
            
//             <div className="mt-2">
//               <button className="text-sm text-gray-600 hover:text-black font-medium flex items-center gap-1">
//                 Change Password
//               </button>
//             </div>
//           </Card>

//           {/* Organization Settings */}
//           <Card>
//             <SectionTitle icon={Globe} title="Organization Settings" />
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
//               <InputField label="Organization Name" value={ORGANIZER_DATA.organization.name} />
//               <div className="relative">
//                 <InputField label="Tax Identification" value={ORGANIZER_DATA.organization.taxId} readOnly />
//                 <CheckCircle size={16} className="absolute top-9 right-3 text-green-500" />
//               </div>
//             </div>
//             <InputField label="Business Registration Address" value={ORGANIZER_DATA.organization.address} />
            
//             <div className="flex items-center justify-between mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
//                    <CreditCard size={20} className="text-gray-600" />
//                 </div>
//                 <div className="text-sm">
//                   <p className="font-medium text-gray-900">{ORGANIZER_DATA.organization.bank}</p>
//                 </div>
//               </div>
//               <button className="text-sm font-medium hover:text-gray-600 flex items-center gap-1">
//                 Edit Bank Details <ChevronRight size={16} />
//               </button>
//             </div>
//           </Card>

//           {/* Notifications */}
//           <Card>
//             <SectionTitle icon={Bell} title="Notifications" />
//             <div className="space-y-4">
//               {[
//                 { key: 'newAttendee', label: 'New attendee registrations', desc: 'Get notified when someone registers.' },
//                 { key: 'sponsorship', label: 'Sponsorship quotes & inquiries', desc: 'Receive updates on sponsor interest.' },
//                 { key: 'payment', label: 'Payment & payout confirmation', desc: 'Confirmations for all transactions.' },
//                 { key: 'reviews', label: 'Post-event reviews', desc: 'Feedback from attendees.' },
//               ].map((item) => (
//                 <div key={item.key} className="flex items-center justify-between">
//                   <div>
//                     <h3 className="text-sm font-medium text-gray-900">{item.label}</h3>
//                     <p className="text-xs text-gray-500">{item.desc}</p>
//                   </div>
//                   <ToggleSwitch 
//                     enabled={notifications[item.key]} 
//                     onChange={() => handleNotificationToggle(item.key)} 
//                   />
//                 </div>
//               ))}
//             </div>
//           </Card>

//           {/* Payments */}
//           <Card>
//             <SectionTitle icon={CreditCard} title="Payments" />
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
//               <div>
//                 <label className="block text-xs font-medium text-gray-500 mb-1.5">Default Currency</label>
//                 <div className="relative">
//                   <select className="w-full appearance-none px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-black outline-none">
//                     <option>{ORGANIZER_DATA.payments.currency}</option>
//                   </select>
//                   <ChevronRight className="absolute right-3 top-3 text-gray-400 rotate-90" size={16} />
//                 </div>
//               </div>
//               <div>
//                 <label className="block text-xs font-medium text-gray-500 mb-1.5">Payout Schedule</label>
//                 <div className="relative">
//                   <select className="w-full appearance-none px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-black outline-none">
//                     <option>{ORGANIZER_DATA.payments.schedule}</option>
//                   </select>
//                   <ChevronRight className="absolute right-3 top-3 text-gray-400 rotate-90" size={16} />
//                 </div>
//               </div>
//             </div>
            
//             <label className="block text-xs font-medium text-gray-500 mb-3">Accepted Payment Methods</label>
//             <div className="flex flex-wrap gap-2">
//               {ORGANIZER_DATA.payments.methods.map((method) => (
//                 <span key={method} className="px-3 py-1.5 bg-black text-white text-xs font-medium rounded-full">
//                   {method}
//                 </span>
//               ))}
//               <button className="px-3 py-1.5 border border-dashed border-gray-300 text-gray-500 text-xs font-medium rounded-full hover:border-gray-400 hover:text-gray-700 transition-colors">
//                 + Add Method
//               </button>
//             </div>
//           </Card>

//           {/* Team Members */}
//           <Card>
//             <SectionTitle 
//               icon={Users} 
//               title="Team Members" 
//               action={<button className="text-sm font-medium hover:text-gray-600">Invite Member</button>} 
//             />
//             <div className="space-y-4">
//               {ORGANIZER_DATA.team.map((member) => (
//                 <div key={member.id} className="flex items-center justify-between group">
//                   <div className="flex items-center gap-3">
//                     <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
//                     <div>
//                       <h4 className="text-sm font-medium text-gray-900">{member.name}</h4>
//                       <p className="text-xs text-gray-500">{member.email}</p>
//                     </div>
//                   </div>
//                   <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full group-hover:bg-gray-200 transition-colors">
//                     {member.role}
//                   </span>
//                 </div>
//               ))}
//             </div>
//           </Card>

//           {/* Branding */}
//           <Card>
//             <SectionTitle icon={ImageIcon} title="Branding" />
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div>
//                 <label className="block text-xs font-medium text-gray-500 mb-2">Logo (White/Black)</label>
//                 <div className="w-24 h-24 bg-black rounded-xl flex items-center justify-center text-white text-2xl font-bold mb-2">
//                   {ORGANIZER_DATA.branding.logo}
//                 </div>
//                 <button className="text-xs text-gray-500 hover:text-black font-medium underline">Upload</button>
//               </div>
//               <div>
//                 <label className="block text-xs font-medium text-gray-500 mb-2">Cover Image (1200x400px)</label>
//                 <div className="w-full h-24 bg-gray-100 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center mb-2">
//                   <span className="text-gray-400 text-xs">No image selected</span>
//                 </div>
//                 <button className="text-xs text-gray-500 hover:text-black font-medium underline">Upload New</button>
//               </div>
//             </div>
//           </Card>

//           {/* Privacy */}
//           <Card>
//             <SectionTitle icon={Eye} title="Privacy" />
//             <div className="flex items-center justify-between">
//               <div>
//                 <h3 className="text-sm font-medium text-gray-900">Public Profile Visibility</h3>
//                 <p className="text-xs text-gray-500">Allow visitors to view your organization page and events.</p>
//               </div>
//               <ToggleSwitch enabled={privacy.publicProfile} onChange={() => setPrivacy({...privacy, publicProfile: !privacy.publicProfile})} />
//             </div>
//           </Card>

//           {/* Danger Zone */}
//           <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
//             <div className="flex items-center gap-2 text-red-600 mb-4">
//               <AlertTriangle size={18} />
//               <h2 className="font-semibold">Danger Zone</h2>
//             </div>
//             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
//               <div>
//                 <h3 className="text-sm font-medium text-gray-900">Deactivate Account</h3>
//                 <p className="text-xs text-gray-500">Temporarily disable your account and hide your profile.</p>
//               </div>
//               <div className="flex gap-3 w-full md:w-auto">
//                 <button className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
//                   Deactivate
//                 </button>
//                 <button className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
//                   Delete Account
//                 </button>
//               </div>
//             </div>
//           </div>

//         </div>
//       </div>
      
//       {/* Mobile Bottom Nav (Visual Only) */}
//       <div className="fixed bottom-0 left-0 w-full bg-[#1a1a1a] text-white p-4 flex justify-around items-center md:hidden z-50 rounded-t-2xl">
//         <div className="w-8 h-8 flex items-center justify-center opacity-50"><Globe size={20}/></div>
//         <div className="w-8 h-8 flex items-center justify-center opacity-50"><MessageSquare size={20}/></div>
//         <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center -mt-8 border-4 border-[#F8F9FB]"><Edit3 size={20}/></div>
//         <div className="w-8 h-8 flex items-center justify-center opacity-50"><Users size={20}/></div>
//         <div className="w-8 h-8 flex items-center justify-center opacity-50"><ImageIcon size={20}/></div>
//       </div>
//     </div>
//   );
// }

export default function OrganizerProfile() {
  return (
    <><h2>page</h2></>
  )
}
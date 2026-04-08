/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Database, 
  Search, 
  Plus, 
  ChevronRight, 
  Star, 
  Menu, 
  X, 
  Info,
  ArrowLeft,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  SkillMaster, 
  UserSkill, 
  SkillLevel, 
  SKILL_LEVEL_DEFINITIONS, 
  CATEGORIES 
} from './types';
import { mockUsers, mockSkillMaster, mockUserSkills } from './mockData';

type View = 'dashboard' | 'member-list' | 'member-detail' | 'skill-list' | 'add-member' | 'add-skill';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Data State
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [skills, setSkills] = useState<SkillMaster[]>(mockSkillMaster);
  const [userSkills, setUserSkills] = useState<UserSkill[]>(mockUserSkills);

  // Search/Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all');

  // Navigation
  const navigateTo = (view: View, userId?: string) => {
    setCurrentView(view);
    if (userId) setSelectedUserId(userId);
    setIsSidebarOpen(false);
  };

  // Helper: Get skills for a specific user
  const getUserSkills = (userId: string) => {
    return userSkills
      .filter(us => us.userId === userId)
      .map(us => ({
        ...us,
        skill: skills.find(s => s.id === us.skillId)!
      }));
  };

  // Helper: Get all skill entries with user info
  const allSkillEntries = useMemo(() => {
    return userSkills.map(us => ({
      ...us,
      user: users.find(u => u.id === us.userId)!,
      skill: skills.find(s => s.id === us.skillId)!
    }));
  }, [userSkills, users, skills]);

  // Filtered Results
  const filteredEntries = useMemo(() => {
    return allSkillEntries.filter(entry => {
      const matchesSearch = entry.skill.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            entry.user.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || entry.skill.category === filterCategory;
      const matchesLevel = filterLevel === 'all' || entry.level === filterLevel;
      return matchesSearch && matchesCategory && matchesLevel;
    }).sort((a, b) => b.level - a.level); // Sort by level descending
  }, [allSkillEntries, searchQuery, filterCategory, filterLevel]);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#F5F5F0]">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 border-b border-[#141414]/10 bg-[#F5F5F0] sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#141414] flex items-center justify-center text-[#F5F5F0] font-bold text-lg">S</div>
          <span className="font-bold tracking-tight text-xl">SkillGrid</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <div className="flex">
        {/* Sidebar / Navigation */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-[#F5F5F0] border-r border-[#141414] transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="hidden lg:flex items-center gap-2 p-8 border-b border-[#141414]">
            <div className="w-10 h-10 bg-[#141414] flex items-center justify-center text-[#F5F5F0] font-bold text-2xl">S</div>
            <span className="font-bold tracking-tighter text-2xl">SkillGrid</span>
          </div>

          <nav className="p-4 space-y-1">
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label="ダッシュボード" 
              active={currentView === 'dashboard'} 
              onClick={() => navigateTo('dashboard')} 
            />
            <NavItem 
              icon={<Users size={20} />} 
              label="メンバ一覧" 
              active={currentView === 'member-list' || currentView === 'member-detail'} 
              onClick={() => navigateTo('member-list')} 
            />
            <NavItem 
              icon={<Database size={20} />} 
              label="スキルリスト" 
              active={currentView === 'skill-list'} 
              onClick={() => navigateTo('skill-list')} 
            />
            <div className="pt-4 pb-2 px-4">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">管理</span>
            </div>
            <NavItem 
              icon={<Plus size={20} />} 
              label="メンバ追加" 
              active={currentView === 'add-member'} 
              onClick={() => navigateTo('add-member')} 
            />
            <NavItem 
              icon={<Plus size={20} />} 
              label="スキル登録" 
              active={currentView === 'add-skill'} 
              onClick={() => navigateTo('add-skill')} 
            />
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-8 border-t border-[#141414]">
            <p className="text-[10px] font-mono opacity-50">© 2026 SKILLGRID v1.0</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView + (selectedUserId || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-4 lg:p-12 max-w-7xl mx-auto"
            >
              {currentView === 'dashboard' && (
                <DashboardView 
                  users={users} 
                  skills={skills} 
                  userSkills={userSkills} 
                  onNavigate={navigateTo}
                />
              )}
              {currentView === 'member-list' && (
                <MemberListView 
                  users={users} 
                  onSelectMember={(id) => navigateTo('member-detail', id)} 
                />
              )}
              {currentView === 'member-detail' && selectedUserId && (
                <MemberDetailView 
                  user={users.find(u => u.id === selectedUserId)!} 
                  skills={getUserSkills(selectedUserId)}
                  onBack={() => navigateTo('member-list')}
                />
              )}
              {currentView === 'skill-list' && (
                <SkillListView 
                  entries={filteredEntries}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  filterCategory={filterCategory}
                  setFilterCategory={setFilterCategory}
                  filterLevel={filterLevel}
                  setFilterLevel={setFilterLevel}
                />
              )}
              {currentView === 'add-member' && (
                <AddMemberView 
                  onAdd={(user) => {
                    setUsers([...users, user]);
                    navigateTo('member-list');
                  }} 
                />
              )}
              {currentView === 'add-skill' && (
                <AddSkillView 
                  users={users}
                  skills={skills}
                  onAdd={(us) => {
                    setUserSkills([...userSkills, us]);
                    navigateTo('skill-list');
                  }} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// --- Components ---

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all
        ${active 
          ? 'bg-[#141414] text-[#F5F5F0]' 
          : 'hover:bg-[#141414]/5 text-[#141414]/70 hover:text-[#141414]'}
      `}
    >
      {icon}
      <span>{label}</span>
      {active && <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 bg-[#F5F5F0] rounded-full" />}
    </button>
  );
}

function SectionHeader({ title, subtitle }: { title: string, subtitle?: string }) {
  return (
    <div className="mb-12 border-b border-[#141414] pb-6">
      <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter mb-2 uppercase">{title}</h1>
      {subtitle && <p className="text-lg italic font-serif opacity-60">{subtitle}</p>}
    </div>
  );
}

function StarRating({ level, size = 16 }: { level: number, size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star 
          key={s} 
          size={size} 
          className={s <= level ? 'fill-[#141414] text-[#141414]' : 'text-[#141414]/20'} 
        />
      ))}
    </div>
  );
}

// --- Views ---

function DashboardView({ users, skills, userSkills, onNavigate }: { 
  users: User[], 
  skills: SkillMaster[], 
  userSkills: UserSkill[],
  onNavigate: (view: View) => void
}) {
  const stats = [
    { label: "登録メンバ", value: users.length, icon: <Users size={24} /> },
    { label: "登録スキル数", value: skills.length, icon: <Database size={24} /> },
    { label: "総スキル習得数", value: userSkills.length, icon: <Star size={24} /> },
  ];

  const topSkills = useMemo(() => {
    const counts: Record<string, number> = {};
    userSkills.forEach(us => {
      counts[us.skillId] = (counts[us.skillId] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([id, count]) => ({
        skill: skills.find(s => s.id === id)!,
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [userSkills, skills]);

  return (
    <div>
      <SectionHeader title="Dashboard" subtitle="組織のスキル資産の概要" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white border border-[#141414] p-8 flex flex-col justify-between h-48 hover:bg-[#141414] hover:text-[#F5F5F0] transition-colors group">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-widest opacity-50 group-hover:opacity-70">{stat.label}</span>
              <div className="opacity-30 group-hover:opacity-100">{stat.icon}</div>
            </div>
            <span className="text-6xl font-bold tracking-tighter">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="border border-[#141414] p-8 bg-white">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Star size={20} />
            人気のスキル TOP 5
          </h3>
          <div className="space-y-4">
            {topSkills.map((item, i) => (
              <div key={i} className="flex items-center justify-between border-b border-[#141414]/10 pb-2">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs opacity-40">0{i+1}</span>
                  <span className="font-bold">{item.skill.name}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-[#141414]/5 rounded-full">{item.skill.category}</span>
                </div>
                <span className="font-mono text-sm">{item.count} 名</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-[#141414] p-8 bg-white flex flex-col justify-center items-center text-center">
          <Info size={48} className="mb-4 opacity-20" />
          <h3 className="text-xl font-bold mb-2">スキルレベルの定義</h3>
          <p className="text-sm opacity-60 mb-6">全社共通の評価基準に基づいてスキルを登録してください。</p>
          <button 
            onClick={() => onNavigate('skill-list')}
            className="px-6 py-3 bg-[#141414] text-[#F5F5F0] text-sm font-bold uppercase tracking-widest hover:scale-105 transition-transform"
          >
            基準を確認する
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberListView({ users, onSelectMember }: { users: User[], onSelectMember: (id: string) => void }) {
  return (
    <div>
      <SectionHeader title="Members" subtitle="スキルを保有するメンバの一覧" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#141414] border border-[#141414]">
        {users.map((user) => (
          <div 
            key={user.id} 
            onClick={() => onSelectMember(user.id)}
            className="bg-white p-8 group cursor-pointer hover:bg-[#141414] hover:text-[#F5F5F0] transition-all"
          >
            <div className="flex justify-between items-start mb-8">
              <span className="font-mono text-xs opacity-40 group-hover:opacity-70">{user.id}</span>
              <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-3xl font-bold tracking-tight mb-1">{user.name}</h3>
            <p className="text-sm opacity-60 group-hover:opacity-80">{user.department}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemberDetailView({ user, skills, onBack }: { user: User, skills: any[], onBack: () => void }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-8 hover:gap-3 transition-all">
        <ArrowLeft size={16} />
        戻る
      </button>

      <div className="flex flex-col lg:flex-row gap-12 mb-12">
        <div className="lg:w-1/3">
          <div className="sticky top-12">
            <div className="w-32 h-32 bg-[#141414] text-[#F5F5F0] flex items-center justify-center text-5xl font-bold mb-6">
              {user.name[0]}
            </div>
            <h1 className="text-5xl font-bold tracking-tighter mb-2">{user.name}</h1>
            <p className="text-xl font-serif italic opacity-60 mb-6">{user.department}</p>
            <div className="space-y-2 border-t border-[#141414] pt-6">
              <div className="flex justify-between text-sm">
                <span className="opacity-50">社員番号</span>
                <span className="font-mono">{user.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-50">登録スキル数</span>
                <span className="font-mono">{skills.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:w-2/3">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-6 opacity-40">保有スキル詳細</h3>
          <div className="space-y-6">
            {skills.length > 0 ? (
              skills.map((s, i) => (
                <div key={i} className="bg-white border border-[#141414] p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-1">{s.skill.category}</span>
                      <h4 className="text-xl font-bold">{s.skill.name}</h4>
                    </div>
                    <div className="text-right">
                      <StarRating level={s.level} />
                      <span className="text-[10px] font-mono opacity-50">Level {s.level}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm border-t border-[#141414]/10 pt-4">
                    <div>
                      <span className="opacity-50 block text-[10px] uppercase">実務経験</span>
                      <span className="font-bold">{s.yearsOfExperience} 年</span>
                    </div>
                    {s.certificationDate && (
                      <div>
                        <span className="opacity-50 block text-[10px] uppercase">資格取得日</span>
                        <span className="font-bold">{s.certificationDate}</span>
                      </div>
                    )}
                  </div>
                  {s.remarks && (
                    <div className="mt-4 text-sm opacity-70 italic font-serif">
                      "{s.remarks}"
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-12 border border-dashed border-[#141414]/20 text-center opacity-40">
                スキルが登録されていません。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillListView({ 
  entries, 
  searchQuery, 
  setSearchQuery, 
  filterCategory, 
  setFilterCategory,
  filterLevel,
  setFilterLevel
}: { 
  entries: any[],
  searchQuery: string,
  setSearchQuery: (q: string) => void,
  filterCategory: string,
  setFilterCategory: (c: string) => void,
  filterLevel: number | 'all',
  setFilterLevel: (l: number | 'all') => void
}) {
  const [showDefinitions, setShowDefinitions] = useState(false);

  return (
    <div>
      <SectionHeader title="Skill List" subtitle="全メンバのスキル習得状況" />

      {/* Search & Filter Bar */}
      <div className="bg-white border border-[#141414] p-6 mb-8 flex flex-col lg:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block opacity-40">検索 (スキル名・氏名)</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="キーワードを入力..."
              className="w-full pl-10 pr-4 py-2 bg-[#F5F5F0] border border-[#141414]/10 focus:border-[#141414] outline-none transition-colors"
            />
          </div>
        </div>
        <div className="w-full lg:w-48">
          <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block opacity-40">カテゴリ</label>
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-4 py-2 bg-[#F5F5F0] border border-[#141414]/10 focus:border-[#141414] outline-none appearance-none cursor-pointer"
          >
            <option value="all">すべて</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="w-full lg:w-48">
          <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block opacity-40">熟練度</label>
          <select 
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="w-full px-4 py-2 bg-[#F5F5F0] border border-[#141414]/10 focus:border-[#141414] outline-none appearance-none cursor-pointer"
          >
            <option value="all">すべて</option>
            {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>Level {l}</option>)}
          </select>
        </div>
        <button 
          onClick={() => setShowDefinitions(!showDefinitions)}
          className="p-2 border border-[#141414] hover:bg-[#141414] hover:text-[#F5F5F0] transition-colors"
          title="レベル定義を表示"
        >
          <Info size={20} />
        </button>
      </div>

      {/* Level Definitions Modal/Section */}
      <AnimatePresence>
        {showDefinitions && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-[#141414] text-[#F5F5F0] p-8 grid grid-cols-1 md:grid-cols-5 gap-6">
              {(Object.entries(SKILL_LEVEL_DEFINITIONS) as any).map(([level, def]: any) => (
                <div key={level} className="border-l border-[#F5F5F0]/20 pl-4">
                  <span className="text-2xl font-bold block mb-1">Lv.{level}</span>
                  <span className="text-xs font-bold uppercase tracking-widest block mb-2 opacity-60">{def.label}</span>
                  <p className="text-[10px] leading-relaxed opacity-80">{def.criteria}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table View */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-[#141414] text-left">
              <th className="py-4 px-2 text-[10px] font-bold uppercase tracking-widest opacity-40">氏名</th>
              <th className="py-4 px-2 text-[10px] font-bold uppercase tracking-widest opacity-40">スキル名</th>
              <th className="py-4 px-2 text-[10px] font-bold uppercase tracking-widest opacity-40">カテゴリ</th>
              <th className="py-4 px-2 text-[10px] font-bold uppercase tracking-widest opacity-40">熟練度</th>
              <th className="py-4 px-2 text-[10px] font-bold uppercase tracking-widest opacity-40 text-right">経験年数</th>
            </tr>
          </thead>
          <tbody>
            {entries.length > 0 ? (
              entries.map((entry, i) => (
                <tr key={i} className="border-b border-[#141414]/10 hover:bg-[#141414]/5 transition-colors group">
                  <td className="py-4 px-2 font-bold">{entry.user.name}</td>
                  <td className="py-4 px-2">{entry.skill.name}</td>
                  <td className="py-4 px-2">
                    <span className="text-[10px] px-2 py-0.5 bg-[#141414]/5 rounded-full">{entry.skill.category}</span>
                  </td>
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-3">
                      <StarRating level={entry.level} size={12} />
                      <span className="text-[10px] font-mono opacity-40">Lv.{entry.level}</span>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-right font-mono text-sm">{entry.yearsOfExperience}y</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center opacity-40 italic font-serif">
                  該当するスキルが見つかりませんでした。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddMemberView({ onAdd }: { onAdd: (user: User) => void }) {
  const [formData, setFormData] = useState({ id: '', name: '', department: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.id && formData.name && formData.department) {
      onAdd(formData as User);
    }
  };

  return (
    <div className="max-w-2xl">
      <SectionHeader title="Add Member" subtitle="新しいメンバをシステムに登録" />
      
      <form onSubmit={handleSubmit} className="bg-white border border-[#141414] p-8 space-y-8">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block opacity-40">社員番号</label>
          <input 
            type="text" 
            required
            value={formData.id}
            onChange={(e) => setFormData({...formData, id: e.target.value})}
            placeholder="例: EMP006"
            className="w-full px-4 py-3 bg-[#F5F5F0] border border-[#141414]/10 focus:border-[#141414] outline-none transition-colors font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block opacity-40">氏名</label>
          <input 
            type="text" 
            required
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="例: 山田 太郎"
            className="w-full px-4 py-3 bg-[#F5F5F0] border border-[#141414]/10 focus:border-[#141414] outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block opacity-40">部署名</label>
          <input 
            type="text" 
            required
            value={formData.department}
            onChange={(e) => setFormData({...formData, department: e.target.value})}
            placeholder="例: 技術開発本部"
            className="w-full px-4 py-3 bg-[#F5F5F0] border border-[#141414]/10 focus:border-[#141414] outline-none transition-colors"
          />
        </div>
        
        <button 
          type="submit"
          className="w-full py-4 bg-[#141414] text-[#F5F5F0] font-bold uppercase tracking-widest hover:bg-[#141414]/90 transition-colors"
        >
          メンバを登録する
        </button>
      </form>
    </div>
  );
}

function AddSkillView({ users, skills, onAdd }: { users: User[], skills: SkillMaster[], onAdd: (us: UserSkill) => void }) {
  const [formData, setFormData] = useState<UserSkill>({
    userId: '',
    skillId: '',
    level: 1,
    yearsOfExperience: 0,
    remarks: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.userId && formData.skillId) {
      onAdd(formData);
    }
  };

  return (
    <div className="max-w-2xl">
      <SectionHeader title="Register Skill" subtitle="メンバのスキル習得状況を登録" />
      
      <form onSubmit={handleSubmit} className="bg-white border border-[#141414] p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block opacity-40">対象メンバ</label>
            <select 
              required
              value={formData.userId}
              onChange={(e) => setFormData({...formData, userId: e.target.value})}
              className="w-full px-4 py-3 bg-[#F5F5F0] border border-[#141414]/10 focus:border-[#141414] outline-none appearance-none cursor-pointer"
            >
              <option value="">選択してください</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.department})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block opacity-40">スキル</label>
            <select 
              required
              value={formData.skillId}
              onChange={(e) => setFormData({...formData, skillId: e.target.value})}
              className="w-full px-4 py-3 bg-[#F5F5F0] border border-[#141414]/10 focus:border-[#141414] outline-none appearance-none cursor-pointer"
            >
              <option value="">選択してください</option>
              {skills.map(s => <option key={s.id} value={s.id}>{s.name} [{s.category}]</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block opacity-40">熟練度 (1-5)</label>
            <div className="flex items-center gap-4 mt-2">
              {[1, 2, 3, 4, 5].map(l => (
                <button 
                  key={l}
                  type="button"
                  onClick={() => setFormData({...formData, level: l as SkillLevel})}
                  className={`w-10 h-10 border border-[#141414] flex items-center justify-center font-bold transition-colors ${formData.level === l ? 'bg-[#141414] text-[#F5F5F0]' : 'hover:bg-[#141414]/5'}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <p className="text-[10px] mt-2 opacity-50 italic">
              {SKILL_LEVEL_DEFINITIONS[formData.level].label}: {SKILL_LEVEL_DEFINITIONS[formData.level].description}
            </p>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block opacity-40">実務経験年数</label>
            <input 
              type="number" 
              min="0"
              required
              value={formData.yearsOfExperience}
              onChange={(e) => setFormData({...formData, yearsOfExperience: Number(e.target.value)})}
              className="w-full px-4 py-3 bg-[#F5F5F0] border border-[#141414]/10 focus:border-[#141414] outline-none transition-colors font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block opacity-40">備考・特記事項</label>
          <textarea 
            value={formData.remarks}
            onChange={(e) => setFormData({...formData, remarks: e.target.value})}
            placeholder="プロジェクトでの役割や具体的な実績など..."
            rows={3}
            className="w-full px-4 py-3 bg-[#F5F5F0] border border-[#141414]/10 focus:border-[#141414] outline-none transition-colors resize-none font-serif italic"
          />
        </div>
        
        <button 
          type="submit"
          className="w-full py-4 bg-[#141414] text-[#F5F5F0] font-bold uppercase tracking-widest hover:bg-[#141414]/90 transition-colors"
        >
          スキル情報を登録する
        </button>
      </form>
    </div>
  );
}

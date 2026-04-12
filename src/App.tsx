/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  Filter,
  LogOut,
  LogIn,
  ExternalLink,
  ShieldCheck,
  UserCircle,
  Home,
  BookOpen,
  FileText,
  Send,
  ClipboardCheck,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserType, 
  SkillMaster, 
  UserSkill, 
  SkillLevel, 
  SKILL_LEVEL_DEFINITIONS, 
  CATEGORIES,
  MemberProfile
} from './types';
import { mockUsers, mockSkillMaster, mockUserSkills } from './mockData';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  db,
  signInAnonymously
} from './firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  setDoc, 
  doc,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type View = 'portal' | 'certification-system' | 'member-mgmt-list' | 'member-mgmt-detail' | 'dashboard' | 'member-list' | 'member-detail' | 'skill-list' | 'add-member' | 'add-skill';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('portal');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Data State
  const [users, setUsers] = useState<UserType[]>([]);
  const [skills, setSkills] = useState<SkillMaster[]>(mockSkillMaster);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // 匿名ログイン（カスタム認証）の場合は常に許可
        if (currentUser.isAnonymous) {
          setUser(currentUser);
          setAuthError(null);
        } else {
          const envAllowed = import.meta.env.VITE_ALLOWED_EMAILS || '';
          const allowedEmails = envAllowed.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
          
          // 常に許可するデフォルトのメールアドレス
          const defaultAllowed = ['clauichini@gmail.com'];
          const isAllowed = defaultAllowed.includes(currentUser.email?.toLowerCase() || '') || 
                            (allowedEmails.length > 0 && allowedEmails.includes(currentUser.email?.toLowerCase() || ''));

          if (!isAllowed && allowedEmails.length > 0) {
            signOut(auth);
            setAuthError('このアカウントにはアクセス権限がありません。');
            setUser(null);
          } else {
            setUser(currentUser);
            setAuthError(null);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listeners
  useEffect(() => {
    if (!user) return;

    // Listen to Skills
    const unsubSkills = onSnapshot(collection(db, 'skills'), (snapshot) => {
      const skillsData = snapshot.docs.map(doc => doc.data() as SkillMaster);
      if (snapshot.empty) {
        mockSkillMaster.forEach(async (s) => {
          await setDoc(doc(db, 'skills', s.id), s);
        });
      } else {
        setSkills(skillsData);
      }
    });

    // Listen to Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserType);
      
      // Initial seed if empty
      if (snapshot.empty) {
        mockUsers.forEach(async (u) => {
          await setDoc(doc(db, 'users', u.id), u);
        });
      } else {
        setUsers(usersData);
      }
    });

    // Listen to UserSkills
    const unsubUserSkills = onSnapshot(collection(db, 'userSkills'), (snapshot) => {
      const skillsData = snapshot.docs.map(doc => doc.data() as UserSkill);
      
      // Initial seed if empty
      if (snapshot.empty) {
        mockUserSkills.forEach(async (us) => {
          await addDoc(collection(db, 'userSkills'), us);
        });
      } else {
        setUserSkills(skillsData);
      }
    });

    return () => {
      unsubSkills();
      unsubUsers();
      unsubUserSkills();
    };
  }, [user]);

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

  const handleLogin = async (id?: string, password?: string) => {
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      if (id && password) {
        if (id === 'Edpas1984' && password === 'edpedp') {
          try {
            await signInAnonymously(auth);
          } catch (anonError: any) {
            console.warn("Anonymous Auth failed, using local session fallback:", anonError);
            // Firebaseの匿名認証が無効な場合のフォールバック
            setUser({
              uid: 'custom-user-edpas',
              displayName: 'Edpas1984',
              isAnonymous: true,
              email: null,
              photoURL: null,
            } as any);
          }
        } else {
          setAuthError('IDまたはパスワードが正しくありません。');
        }
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.code === 'auth/operation-not-allowed') {
        setAuthError('匿名認証が有効になっていません。管理者に連絡してください。');
      } else {
        setAuthError('ログインに失敗しました。');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentView('dashboard');
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const exportToPDF = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Temporarily hide elements with 'no-pdf' class
    const noPdfElements = element.querySelectorAll('.no-pdf');
    noPdfElements.forEach(el => (el as HTMLElement).style.display = 'none');

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#F5F5F0'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
    } finally {
      noPdfElements.forEach(el => (el as HTMLElement).style.display = '');
    }
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
                            (entry.user?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || entry.skill.category === filterCategory;
      const matchesLevel = filterLevel === 'all' || entry.level === filterLevel;
      return matchesSearch && matchesCategory && matchesLevel;
    }).sort((a, b) => b.level - a.level); // Sort by level descending
  }, [allSkillEntries, searchQuery, filterCategory, filterLevel]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#141414] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} error={authError} loading={isLoggingIn} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#F5F5F0]">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 border-b border-[#141414]/10 bg-[#F5F5F0] sticky top-0 z-50">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigateTo('portal')}
        >
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
          fixed inset-y-0 left-0 z-40 w-64 bg-[#F5F5F0] border-r border-[#141414] transform transition-transform duration-300 ease-in-out flex flex-col
          lg:relative lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex-shrink-0 flex items-center gap-2 p-8 border-b border-[#141414]">
            <div className="w-10 h-10 bg-[#141414] flex items-center justify-center text-[#F5F5F0] font-bold text-2xl">S</div>
            <span className="font-bold tracking-tighter text-2xl">SkillGrid</span>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            <NavItem 
              icon={<Home size={20} />} 
              label="社内システムポータル" 
              active={currentView === 'portal'} 
              onClick={() => navigateTo('portal')} 
            />
            <div className="pt-4 pb-2 px-4">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">スキル管理</span>
            </div>
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
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">メンバ管理</span>
            </div>
            <NavItem 
              icon={<UserCircle size={20} />} 
              label="管理一覧" 
              active={currentView === 'member-mgmt-list' || currentView === 'member-mgmt-detail'} 
              onClick={() => navigateTo('member-mgmt-list')} 
            />

            <div className="pt-4 pb-2 px-4">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">認定制度について</span>
            </div>
            <NavItem 
              icon={<BookOpen size={20} />} 
              label="認定制度について" 
              active={currentView === 'certification-system'} 
              onClick={() => navigateTo('certification-system')} 
            />

            <div className="pt-4 pb-2 px-4">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">登録</span>
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
            
            <div className="pt-8 mt-4 border-t border-[#141414]/10">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-all cursor-pointer"
              >
                <LogOut size={20} />
                <span>ログアウト</span>
              </button>
            </div>
          </nav>

          <div className="flex-shrink-0 p-8 border-t border-[#141414] bg-[#F5F5F0]">
            <div className="flex items-center gap-3 mb-4">
              <img src={user.photoURL || ""} alt="" className="w-8 h-8 rounded-full border border-[#141414]/10" />
              <div className="overflow-hidden">
                <p className="text-xs font-bold truncate">{user.displayName}</p>
                <p className="text-[10px] opacity-50 truncate">{user.email}</p>
              </div>
            </div>
            <p className="text-[10px] font-mono opacity-50">© 2026 SKILLGRID v1.0</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen" id="main-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView + (selectedUserId || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-4 lg:p-12 max-w-7xl mx-auto"
            >
              {currentView === 'portal' && (
                <PortalView onNavigate={navigateTo} />
              )}
              {currentView === 'certification-system' && (
                <CertificationSystemView />
              )}
              {currentView === 'member-mgmt-list' && (
                <MemberMgmtListView 
                  users={users} 
                  onSelectMember={(id) => navigateTo('member-mgmt-detail', id)}
                  onAddMember={() => navigateTo('add-member')}
                  onDeleteMember={async (id) => {
                    if (window.confirm('このメンバを削除してもよろしいですか？')) {
                      try {
                        await deleteDoc(doc(db, 'users', id));
                      } catch (error) {
                        console.error("Error deleting member:", error);
                      }
                    }
                  }}
                />
              )}
              {currentView === 'member-mgmt-detail' && selectedUserId && (
                <MemberMgmtDetailView 
                  user={users.find(u => u.id === selectedUserId)!} 
                  onBack={() => navigateTo('member-mgmt-list')}
                  onUpdateUser={async (updatedUser) => {
                    await setDoc(doc(db, 'users', updatedUser.id), updatedUser);
                  }}
                />
              )}
              {currentView === 'dashboard' && (
                <DashboardView 
                  users={users} 
                  skills={skills} 
                  userSkills={userSkills} 
                  onNavigate={navigateTo}
                  onExport={() => exportToPDF('main-content', 'skillgrid-dashboard')}
                />
              )}
              {currentView === 'member-list' && (
                <MemberListView 
                  users={users} 
                  onSelectMember={(id) => navigateTo('member-detail', id)} 
                  onExport={() => exportToPDF('main-content', 'skillgrid-members')}
                />
              )}
              {currentView === 'member-detail' && selectedUserId && (
                <MemberDetailView 
                  user={users.find(u => u.id === selectedUserId)!} 
                  skills={getUserSkills(selectedUserId)}
                  onBack={() => navigateTo('member-list')}
                  onExport={() => exportToPDF('main-content', `skillgrid-member-${selectedUserId}`)}
                  onUpdateUser={async (updatedUser) => {
                    await setDoc(doc(db, 'users', updatedUser.id), updatedUser);
                  }}
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
                  onExport={() => exportToPDF('main-content', 'skillgrid-skills')}
                />
              )}
              {currentView === 'add-member' && (
                <AddMemberView 
                  onAdd={async (newUser) => {
                    try {
                      await setDoc(doc(db, 'users', newUser.id), { ...newUser, workExperiences: [] });
                      navigateTo('member-list');
                    } catch (error) {
                      console.error("Error adding member:", error);
                    }
                  }} 
                />
              )}
              {currentView === 'add-skill' && (
                <AddSkillView 
                  users={users}
                  skills={skills}
                  onAdd={async (us) => {
                    try {
                      await addDoc(collection(db, 'userSkills'), us);
                      navigateTo('skill-list');
                    } catch (error) {
                      console.error("Error adding skill:", error);
                    }
                  }} 
                  onAddMaster={async (newMaster) => {
                    try {
                      await setDoc(doc(db, 'skills', newMaster.id), newMaster);
                    } catch (error) {
                      console.error("Error adding skill master:", error);
                    }
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

function LoginScreen({ onLogin, error, loading }: { onLogin: (id?: string, password?: string) => void, error: string | null, loading: boolean }) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading) onLogin(id, password);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white border border-[#141414] p-12 text-center shadow-[20px_20px_0px_0px_rgba(20,20,20,0.05)]"
      >
        <div className="w-20 h-20 bg-[#141414] flex items-center justify-center text-[#F5F5F0] font-bold text-4xl mx-auto mb-8">S</div>
        <h1 className="text-4xl font-bold tracking-tighter mb-2 uppercase">SkillGrid</h1>
        <p className="text-sm font-serif italic opacity-60 mb-12">社員スキル管理システム</p>
        
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div>
            <input 
              type="text" 
              placeholder="ログインID"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full px-4 py-3 bg-[#F5F5F0] border border-[#141414]/10 focus:border-[#141414] outline-none text-sm"
              disabled={loading}
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#F5F5F0] border border-[#141414]/10 focus:border-[#141414] outline-none text-sm"
              disabled={loading}
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#141414] text-[#F5F5F0] font-bold uppercase tracking-widest hover:bg-[#141414]/90 transition-all disabled:opacity-50"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <p className="mt-8 text-[10px] font-mono opacity-40 uppercase tracking-widest leading-relaxed">
          社内アカウントを使用して<br />システムにアクセスしてください
        </p>
      </motion.div>
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

function PortalView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const apps = [
    { 
      id: 'skill', 
      title: '社員スキル管理システム', 
      desc: 'スキルの可視化・検索・登録', 
      icon: <Database size={32} />, 
      view: 'dashboard' as View 
    },
    { 
      id: 'mgmt', 
      title: 'メンバ管理システム', 
      desc: '成果・課題・性格・キャリアパス管理', 
      icon: <UserCircle size={32} />, 
      view: 'member-mgmt-list' as View 
    },
    { 
      id: 'external', 
      title: '認定制度について', 
      desc: '認定制度の説明・運用方法・ランク定義', 
      icon: <BookOpen size={32} />, 
      view: 'certification-system' as View 
    },
  ];

  return (
    <div className="py-12">
      <SectionHeader title="Portal" subtitle="社内システムポータル" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {apps.map((app) => (
          <motion.div 
            key={app.id}
            whileHover={{ y: -5 }}
            onClick={() => onNavigate(app.view)}
            className="bg-white border border-[#141414] p-10 cursor-pointer group hover:bg-[#141414] hover:text-[#F5F5F0] transition-all flex flex-col h-80 justify-between"
          >
            <div className="opacity-40 group-hover:opacity-100 transition-opacity">{app.icon}</div>
            <div>
              <h3 className="text-2xl font-bold mb-2 tracking-tight">{app.title}</h3>
              <p className="text-sm opacity-60 group-hover:opacity-80 font-serif italic">{app.desc}</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              アクセスする <ChevronRight size={12} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CertificationSystemView() {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const pages = [
    { 
      title: "認定制度について", 
      content: "2025/9/19 ES事業部\n\n本認定制度は、従業員に対する認定制度を定めることにより\n社員教育制度の合理化、社員評価制度の明確化による合理的な運営、\nおよび営業活動への寄与を目的として定める" 
    },
    { title: "目次", content: "1 認定制度について\n2 目的、背景、期待する効果\n3 運用方法\n4 認定ランク\n5 スキルマトリクス要件\n6 詳細要件/研修体系\n7 研修講座一覧" },
    { 
      title: "目的、背景、期待する効果", 
      isTable: true,
      headers: ["目的", "課題・背景", "期待する効果"],
      rows: [
        {
          id: 1,
          icon: <Database className="text-blue-500" />,
          title: "教育体制、教育体系の整備",
          purpose: "教育体制、教育体系の整備",
          background: "未経験社員、ロースキル、習熟度の低い社員の参画難易度が高いため、難易度を低下させることが求められている",
          effect: "新人、未経験着任率の向上（xx%→xx%）"
        },
        {
          id: 2,
          icon: <Search className="text-green-500" />,
          title: "営業活動の合理化",
          purpose: "営業活動の合理化",
          background: "営業活動を行う際、案件にマッチするメンバの選定を営業担当のみでも可能とし営業活動の合理化が必要であった",
          effect: "営業活動の稼働削減（xxH/月→xxH/月）"
        },
        {
          id: 3,
          icon: <ShieldCheck className="text-red-500" />,
          title: "案件ミスマッチの防止",
          purpose: "案件ミスマッチによるトラブル発生の歯止め",
          background: "着任前に現場特化分野の教育を行う機会を設け、知見をフィードバックし着任前にミスマッチの確率を下げる活動が求められている。案件ミスマッチやスキル不足による離任歯止め策を講じる必要がある。",
          effect: "離職率、離任率の低下（xx%→xx%）\n人の異動関連の上位層の調整稼働低減（xx%→xx%）"
        },
        {
          id: 4,
          icon: <Plus className="text-purple-500" />,
          title: "外部研修利用の活性化",
          purpose: "外部研修利用の活性化",
          background: "外部研修制度の形骸化しているため改善する必要があった。個々に履修計画の立案を促すも腰が重い為、教育制度の見直しに併せ指定することとした",
          effect: "外部研修制度を全員が活用しスキルレベルの底上げにつなげる（資格取得や単金アップにつなげる）"
        },
        {
          id: 5,
          icon: <Star className="text-yellow-500" />,
          title: "スキルレベルの向上",
          purpose: "スキルレベルの棚卸を行うことで、学習意欲や知識欲を喚起する",
          background: "年次の深いメンバについて、業務輻輳やモチベーション低下によるスキルレベル停滞、向上心の低下の歯止めを行う必要がある",
          effect: "資格取得や単金アップ（xx名→xx名）"
        }
      ]
    },
    { 
      title: "運用方法", 
      isSteps: true,
      steps: [
        { id: 1, label: "研修履修", desc: "34分野の研修講座を履修", icon: <BookOpen size={24} />, color: "bg-[#4361EE]" },
        { id: 2, label: "レポート提出", desc: "全研修を履修後、レポート提出", icon: <FileText size={24} />, color: "bg-[#3A0CA3]" },
        { id: 3, label: "認定申請", desc: "ワークフローから認定申請", icon: <Send size={24} />, color: "bg-[#7209B7]" },
        { id: 4, label: "審査", desc: "決裁者による内容の審査", icon: <ClipboardCheck size={24} />, color: "bg-[#B5179E]" },
        { id: 5, label: "合議・決定", desc: "認定ランクの合議・決定", icon: <Users size={24} />, color: "bg-[#F72585]" },
        { id: 6, label: "通知・FB", desc: "認定通知・フィードバック", icon: <Bell size={24} />, color: "bg-[#4CC9F0]" },
      ]
    },
    { 
      title: "認定ランク", 
      isRankTable: true,
      ranks: [
        { level: "レベル７", name: "エキスパート", target: "全社を牽引する専門家", criteria: "社外でも認められる高度な専門性と実績" },
        { level: "レベル６", name: "準エキスパート", target: "高度な専門性を持つ中核人材", criteria: "複雑な課題を独力で解決し、後進を指導できる" },
        { level: "レベル５", name: "上級", target: "自立した専門家", criteria: "広範な知識と経験を持ち、プロジェクトをリードできる" },
        { level: "レベル４", name: "準上級", target: "安定した実務遂行者", criteria: "標準的な業務を高い品質で完遂できる" },
        { level: "レベル３", name: "中級", target: "独力での業務遂行者", criteria: "基本的な業務を独力でこなせる" },
        { level: "レベル２", name: "準中級", target: "初歩的な実務経験者", criteria: "指導の下で実務を遂行できる" },
        { level: "レベル１", name: "初級", target: "基礎知識習得者", criteria: "用語や概念を理解している" },
        { level: "未経験", name: "エントリー", target: "新卒・中途採用者", criteria: "研修受講中の状態" },
      ]
    },
    {
      title: "スキルマトリクス要件",
      isSkillMatrix: true,
      categories: [
        { name: "パーソナル", span: 7 },
        { name: "ビジネス/インダストリー", span: 4 },
        { name: "プロジェクトマネジメント", span: 3 },
        { name: "メソッドロジー", span: 6 },
        { name: "テクノロジー", span: 14 }
      ],
      skills: [
        "基本1", "リーダーシップ基礎", "コミュニケーション基礎", "ネゴシエーション基礎", "ITスペシャリストのリーダーシップ", "ITスペシャリストのコミュニケーション", "ITスペシャリストのネゴシエーション",
        "IT基礎", "インダストリー業務知識の基礎", "インダストリーアプリケーション知識", "最新ビジネス動向",
        "IT基礎", "プロジェクトマネジメント基礎", "コミュニティ活動",
        "IT基礎", "IT基礎", "ソリューションメソッドロジー", "コンサルティングメソッドロジー", "システム管理ソリューション", "コミュニティ活動",
        "IT基礎", "IT基礎", "システム開発基礎", "手法・技法", "システム設計", "システム構築", "システム運用/保守", "最新技術動向", "システム設計・上級", "システム構築・上級", "システム運用/保守・上級", "ソリューションメソッドロジー", "システム管理ソリューション", "コミュニティ活動"
      ],
      rows: [
        { no: 1, rank: "レベル7（高度IT人材）", name: "エキスパート", values: [1,2,3,3,4,4,4,1,2,3,4,1,2,3,1,2,3,1,2,3,3,3,4,1,2,3,3,3,3,3,4,4,4,4,4,4,5] },
        { no: 2, rank: "レベル6（高度IT人材）", name: "準エキスパート", values: [1,2,3,3,4,4,4,1,2,3,1,1,2,3,1,2,3,3,3,4,1,2,3,3,3,3,3,4,4,4,4,4,4,5] },
        { no: 3, rank: "レベル5（高度IT人材）", name: "上級", values: [1,2,3,3,4,4,4,1,2,3,1,1,2,0,1,2,3,3,3,4,1,2,3,3,3,3,3,4,4,4,4,4,4,5] },
        { no: 4, rank: "レベル4（高度IT人材）", name: "準上級", values: [1,2,3,3,4,4,4,1,2,3,1,1,2,0,1,2,3,3,0,0,1,2,3,3,3,3,3,4,4,4,4,4,4,5] },
        { no: 5, rank: "レベル3（ミドル）", name: "中級", values: [1,2,3,3,4,4,4,1,2,0,0,1,2,0,1,2,3,3,0,0,1,2,3,3,3,3,3,0,0,0,0,4,4,5] },
        { no: 6, rank: "レベル2（ミドル）", name: "準中級", values: [1,2,3,3,4,4,4,1,2,0,0,1,2,0,1,2,3,3,0,0,1,2,3,0,0,0,0,0,0,0,0,0,4,5] },
        { no: 7, rank: "レベル1（エントリー）", name: "初級", values: [1,2,3,3,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0] },
        { no: 8, rank: "新入社員", name: "未経験", values: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] }
      ]
    },
    {
      title: "詳細要件/研修体系",
      isDetailedMatrix: true,
      sections: [
        {
          category: "パーソナル（人間力）",
          skills: ["基本1", "リーダーシップ基礎", "コミュニケーション基礎", "ネゴシエーション基礎", "ITスペシャリストのリーダーシップ", "ITスペシャリストのコミュニケーション", "ITスペシャリストのネゴシエーション"],
          rows: [
            { rank: "レベル7（高度IT人材）", values: ["AD-V-1", "AD-V-2", "AD-V-3", "AD-V-4", "AD-V-5", "AD-V-6", "AD-V-7"] },
            { rank: "レベル6（高度IT人材）", values: ["AD-U-1", "AD-U-2", "AD-U-3", "AD-U-4", "AD-U-5", "AD-U-6", "AD-U-7"] },
            { rank: "レベル5（高度IT人材）", values: ["AD-T-1", "AD-T-2", "AD-T-3", "AD-T-4", "AD-T-5", "AD-T-6", "AD-T-7"] },
            { rank: "レベル4（高度IT人材）", values: ["AD-S-1", "AD-S-2", "AD-S-3", "AD-S-4", "AD-S-5", "AD-S-6", "AD-S-7"] },
            { rank: "レベル3（ミドル）", values: ["AD-R-1", "AD-R-2", "AD-R-3", "AD-R-4", "|", "|", "|"] },
            { rank: "レベル2（ミドル）", values: ["AD-Q-1", "AD-Q-2", "AD-Q-3", "AD-Q-4", "|", "|", "|"] },
            { rank: "レベル1（エントリー）", values: ["AD-P-1", "AD-P-2", "AD-P-3", "AD-P-4", "|", "|", "|"] },
            { rank: "新入社員", values: ["AD-1", "|", "AD-3", "|", "|", "|", "|"] }
          ]
        },
        {
          category: "ビジネス/インダストリー（業務）",
          skills: ["IT基礎", "インダストリー業務知識の基礎", "インダストリーアプリケーション知識", "最新ビジネス動向"],
          rows: [
            { rank: "レベル7（高度IT人材）", values: ["業V-1", "業V-2", "業V-3", "業V-4"] },
            { rank: "レベル6（高度IT人材）", values: ["業U-1", "業U-2", "業U-3", "業U-4"] },
            { rank: "レベル5（高度IT人材）", values: ["業T-1", "業T-2", "業T-3", "業T-4"] },
            { rank: "レベル4（高度IT人材）", values: ["業S-1", "業S-2", "業S-3", "業S-4"] },
            { rank: "レベル3（ミドル）", values: ["業R-1", "業R-2", "業R-3", "業R-4"] },
            { rank: "レベル2（ミドル）", values: ["業Q-1", "業Q-2", "業Q-3", "業Q-4"] },
            { rank: "レベル1（エントリー）", values: ["業P-1", "業P-2", "業P-3", "業P-4"] },
            { rank: "新入社員", values: ["業-1", "業-1", "業-3", "業-1"] }
          ]
        },
        {
          category: "プロジェクトマネジメント",
          skills: ["IT基礎", "プロジェクトマネジメント基礎", "コミュニティ活動"],
          rows: [
            { rank: "レベル7（高度IT人材）", values: ["AD-V-8", "AD-V-9", "AD-V-10"] },
            { rank: "レベル6（高度IT人材）", values: ["AD-U-8", "AD-U-9", "AD-U-10"] },
            { rank: "レベル5（高度IT人材）", values: ["AD-T-8", "AD-T-9", "AD-T-10"] },
            { rank: "レベル4（高度IT人材）", values: ["AD-S-8", "AD-S-9", "AD-S-10"] },
            { rank: "レベル3（ミドル）", values: ["AD-R-8", "AD-R-9", "AD-R-10"] },
            { rank: "レベル2（ミドル）", values: ["AD-Q-8", "AD-Q-9", "AD-Q-10"] },
            { rank: "レベル1（エントリー）", values: ["AD-P-8", "AD-P-9", "AD-P-10"] },
            { rank: "新入社員", values: ["AD-8", "AD-9", "AD-10"] }
          ]
        },
        {
          category: "メソッドロジー",
          skills: ["IT基礎", "IT基礎", "ソリューションメソッドロジー", "コンサルティングメソッドロジー", "システム管理ソリューション", "コミュニティ活動"],
          rows: [
            { rank: "レベル7（高度IT人材）", values: ["AD-V-11", "AD-V-12", "AD-V-13", "AD-V-14", "AD-V-15", "AD-V-16"] },
            { rank: "レベル6（高度IT人材）", values: ["AD-U-11", "AD-U-12", "AD-U-13", "AD-U-14", "AD-U-15", "AD-U-16"] },
            { rank: "レベル5（高度IT人材）", values: ["AD-T-11", "AD-T-12", "AD-T-13", "AD-T-14", "AD-T-15", "AD-T-16"] },
            { rank: "レベル4（高度IT人材）", values: ["AD-S-11", "AD-S-12", "AD-S-13", "AD-S-14", "AD-S-15", "AD-S-16"] },
            { rank: "レベル3（ミドル）", values: ["AD-R-11", "AD-R-12", "AD-R-13", "AD-R-14", "AD-R-15", "AD-R-16"] },
            { rank: "レベル2（ミドル）", values: ["AD-Q-11", "AD-Q-12", "AD-Q-13", "AD-Q-14", "AD-Q-15", "AD-Q-16"] },
            { rank: "レベル1（エントリー）", values: ["AD-P-11", "AD-P-12", "AD-P-13", "AD-P-14", "AD-P-15", "AD-P-16"] },
            { rank: "新入社員", values: ["AD-11", "AD-12", "AD-13", "AD-14", "AD-15", "AD-16"] }
          ]
        },
        {
          category: "テクノロジー",
          skills: ["IT基礎(NW)", "IT基礎(サーバ)", "システム開発基礎", "手法・技法", "システム設計", "システム構築", "システム運用/保守", "最新技術動向", "システム設計・上級", "システム構築・上級", "システム運用/保守・上級", "ソリューションメソッドロジー", "システム管理ソリューション", "コミュニティ活動"],
          rows: [
            { rank: "レベル7（高度IT人材）", values: ["SC-V-1", "SC-V-2", "SC-V-3", "SC-V-4", "SC-V-5", "SC-V-6", "SC-V-7", "SC-V-8", "SC-V-9", "SC-V-10", "SC-V-11", "SC-V-12", "SC-V-13", "AD-V-16"] },
            { rank: "レベル6（高度IT人材）", values: ["SC-U-1", "SC-U-2", "SC-U-3", "SC-U-4", "SC-U-5", "SC-U-6", "SC-U-7", "SC-U-8", "SC-U-9", "SC-U-10", "SC-U-11", "SC-U-12", "SC-U-13", "AD-U-16"] },
            { rank: "レベル5（高度IT人材）", values: ["SC-T-1", "SC-T-2", "SC-T-3", "SC-T-4", "SC-T-5", "SC-T-6", "SC-T-7", "SC-T-8", "SC-T-9", "SC-T-10", "SC-T-11", "SC-T-12", "SC-T-13", "AD-T-16"] },
            { rank: "レベル4（高度IT人材）", values: ["SC-S-1", "SC-S-2", "SC-S-3", "SC-S-4", "SC-S-5", "SC-S-6", "SC-S-7", "SC-S-8", "SC-S-9", "SC-S-10", "SC-S-11", "SC-S-12", "SC-S-13", "AD-S-16"] },
            { rank: "レベル3（ミドル）", values: ["SC-R-1", "SC-R-2", "SC-R-3", "SC-R-4", "SC-R-5", "SC-R-6", "SC-R-7", "SC-R-8", "SC-R-9", "SC-R-10", "SC-R-11", "SC-R-12", "SC-R-13", "AD-R-16"] },
            { rank: "レベル2（ミドル）", values: ["SC-Q-1", "SC-Q-2", "SC-Q-3", "SC-Q-4", "SC-Q-5", "SC-Q-6", "SC-Q-7", "SC-Q-8", "SC-Q-9", "SC-Q-10", "SC-Q-11", "SC-Q-12", "SC-Q-13", "AD-Q-16"] },
            { rank: "レベル1（エントリー）", values: ["SC-P-1", "SC-P-2", "SC-P-3", "SC-P-4", "SC-P-5", "SC-P-6", "SC-P-7", "SC-P-8", "SC-P-9", "SC-P-10", "SC-P-11", "SC-P-12", "SC-P-13", "AD-P-16"] },
            { rank: "新入社員", values: ["SC-1", "SC-2", "SC-3", "SC-4", "SC-5", "SC-6", "SC-7", "SC-8", "SC-9", "SC-10", "SC-11", "SC-12", "SC-13", "AD-16"] }
          ]
        }
      ]
    },
    {
      title: "研修講座一覧",
      isTrainingList: true,
      sections: [
        {
          category: "パーソナル（人間力）",
          rows: [
            { type: "AD", name: "自己理解と他者理解のためのエニアグラム基礎", target: "AD-V-1^AD-U-1^AD-T-1^AD-S-1^AD-R-1^AD-Q-1^AD-P-1" },
            { type: "AD", name: "自己理解と他者理解のためのコミュニケーションの全の全", target: "AD-V-1^AD-U-1^AD-T-1^AD-S-1^AD-R-1^AD-Q-1^AD-P-1" },
            { type: "AD", name: "自己理解と他者理解のためのコミュニケーションの全の全", target: "AD-V-1^AD-U-1^AD-T-1^AD-S-1^AD-R-1^AD-Q-1^AD-P-1" },
            { type: "AD", name: "自己理解と他者理解のためのビジネス・トーキング", target: "AD-V-1^AD-U-1^AD-T-1^AD-S-1^AD-R-1^AD-Q-1^AD-P-1" },
            { type: "AD", name: "自己理解と他者理解のためのアイデアを出すための発想法", target: "AD-V-1^AD-U-1^AD-T-1^AD-S-1^AD-R-1^AD-Q-1^AD-P-1" },
            { type: "AD", name: "自己理解と他者理解のためのクリエイティブ・シンキング", target: "AD-V-1^AD-U-1^AD-T-1^AD-S-1^AD-R-1^AD-Q-1^AD-P-1" },
            { type: "AD", name: "【研修動画】新入社員スタートアップコース研修の振り返り（2年目に向けての心構え）【対話型ライブオンライン研修】", target: "AD-1" },
            { type: "AD", name: "【研修動画】新入社員スタートアップコース研修の振り返り（2年目に向けての心構え）", target: "AD-1" },
            { type: "AD", name: "ストーリーで学ぶ ビジネスリーダー（マインド編）", target: "AD-V-2^AD-U-2^AD-T-2^AD-S-2^AD-R-2^AD-Q-2^AD-P-2^AD-2" },
            { type: "AD", name: "ストーリーで学ぶ ビジネスリーダー（ビジョン設定・戦略の構築編）", target: "AD-V-2^AD-U-2^AD-T-2^AD-S-2^AD-R-2^AD-Q-2^AD-P-2^AD-2" },
            { type: "AD", name: "ストーリーで学ぶ ビジネスリーダー（マネジメント(PDCA)／仕事の進め方編）", target: "AD-V-2^AD-U-2^AD-T-2^AD-S-2^AD-R-2^AD-Q-2^AD-P-2^AD-2" },
            { type: "AD", name: "ストーリーで学ぶ ビジネスリーダー（ビジョン・戦略の構築実践／チームビルディング編）", target: "AD-V-2^AD-U-2^AD-T-2^AD-S-2^AD-R-2^AD-Q-2^AD-P-2^AD-2" },
            { type: "AD", name: "ストーリーで学ぶ ビジネスリーダー（リーダーとしてのセルフマネジメント編）", target: "AD-V-2^AD-U-2^AD-T-2^AD-S-2^AD-R-2^AD-Q-2^AD-P-2^AD-2" },
            { type: "AD", name: "周囲への影響力を高めるセルフリーダーシップ", target: "AD-V-2^AD-U-2^AD-T-2^AD-S-2^AD-R-2^AD-Q-2^AD-P-2^AD-2" },
            { type: "AD", name: "【研修動画】自己理解とリーダーシップ（自己の特性と強みを理解し、組織の中での振る舞いや発揮スキルについて）", target: "AD-V-2^AD-U-2^AD-T-2^AD-S-2^AD-R-2^AD-Q-2^AD-P-2^AD-2" },
            { type: "AD", name: "自己理解と他者理解のためのコミュニケーションの全の全", target: "AD-V-3^AD-U-3^AD-T-3^AD-S-3^AD-R-3^AD-Q-3^AD-P-3^AD-3" },
            { type: "AD", name: "新入社員マインド", target: "AD-V-3^AD-U-3^AD-T-3^AD-S-3^AD-R-3^AD-Q-3^AD-P-3^AD-3" },
            { type: "AD", name: "マネジメントの要諦シリーズ（他者とのコミュニケーションの勘所）", target: "AD-V-3^AD-U-3^AD-T-3^AD-S-3^AD-R-3^AD-Q-3^AD-P-3^AD-3" },
            { type: "AD", name: "コミュニケーション心理学", target: "AD-V-3^AD-U-3^AD-T-3^AD-S-3^AD-R-3^AD-Q-3^AD-P-3^AD-3" },
            { type: "AD", name: "【公開セミナー】 マネジメントの要諦シリーズ（他者とのコミュニケーションの勘所）", target: "AD-V-3^AD-U-3^AD-T-3^AD-S-3^AD-R-3^AD-Q-3^AD-P-3^AD-3" },
            { type: "AD", name: "自己理解と他者理解のためのコミュニケーションの全の全", target: "AD-V-3^AD-U-3^AD-T-3^AD-S-3^AD-R-3^AD-Q-3^AD-P-3^AD-3" },
            { type: "AD", name: "論理的思考力", target: "AD-V-4^AD-U-4^AD-T-4^AD-S-4^AD-R-4^AD-Q-4^AD-P-4^AD-4" },
            { type: "AD", name: "自己理解と他者理解のためのエニアグラム基礎", target: "AD-V-5^AD-U-5^AD-T-5^AD-S-5^AD-R-5^AD-Q-5^AD-P-5^AD-5" },
            { type: "AD", name: "自己理解と他者理解のためのコミュニケーションの全の全", target: "AD-V-5^AD-U-5^AD-T-5^AD-S-5^AD-R-5^AD-Q-5^AD-P-5^AD-5" },
            { type: "AD", name: "マネジメントの要諦シリーズ（他者とのコミュニケーションの勘所）", target: "AD-V-5^AD-U-5^AD-T-5^AD-S-5^AD-R-5^AD-Q-5^AD-P-5^AD-5" },
            { type: "AD", name: "マネジメントの要諦シリーズ（他者の育成）", target: "AD-V-5^AD-U-5^AD-T-5^AD-S-5^AD-R-5^AD-Q-5^AD-P-5^AD-5" },
            { type: "AD", name: "【TOP MANAGEMENTシリーズ】自己変革と上級管理職・経営層シリーズ（レクチャー編：マインドセット - 変化のメカニズム(1/2) -）", target: "AD-V-16^AD-U-16^AD-T-16^AD-S-16^AD-R-16^AD-Q-16^AD-P-16^AD-16" },
            { type: "AD", name: "【TOP MANAGEMENTシリーズ】自己変革と上級管理職・経営層シリーズ（レクチャー編：マインドセット - 変化のメカニズム(2/2) -）", target: "AD-V-16^AD-U-16^AD-T-16^AD-S-16^AD-R-16^AD-Q-16^AD-P-16^AD-16" },
            { type: "AD", name: "【TOP MANAGEMENTシリーズ】自己変革と上級管理職・経営層シリーズ（レクチャー編：ビジョン・パーパス・バリュー編）", target: "AD-V-16^AD-U-16^AD-T-16^AD-S-16^AD-R-16^AD-Q-16^AD-P-16^AD-16" },
            { type: "AD", name: "【TOP MANAGEMENTシリーズ】自己変革と上級管理職・経営層シリーズ（レクチャー編：戦略編）", target: "AD-V-16^AD-U-16^AD-T-16^AD-S-16^AD-R-16^AD-Q-16^AD-P-16^AD-16" },
            { type: "AD", name: "【TOP MANAGEMENTシリーズ】自己変革と上級管理職・経営層シリーズ（レクチャー編：組織文化 - 変化への要件 -）", target: "AD-V-16^AD-U-16^AD-T-16^AD-S-16^AD-R-16^AD-Q-16^AD-P-16^AD-16" },
            { type: "AD", name: "【TOP MANAGEMENTシリーズ】自己変革と上級管理職・経営層シリーズ（レクチャー編：組織文化 - 変化と抵抗 -）", target: "AD-V-16^AD-U-16^AD-T-16^AD-S-16^AD-R-16^AD-Q-16^AD-P-16^AD-16" },
            { type: "AD", name: "【TOP MANAGEMENTシリーズ】自己変革と上級管理職・経営層シリーズ（レクチャー編：組織文化 - 心理的安全性の醸成 -）", target: "AD-V-16^AD-U-16^AD-T-16^AD-S-16^AD-R-16^AD-Q-16^AD-P-16^AD-16" },
            { type: "AD", name: "【TOP MANAGEMENTシリーズ】自己変革と上級管理職・経営層シリーズ（レクチャー編：経営管理 - 何を管理すべきか -）", target: "AD-V-16^AD-U-16^AD-T-16^AD-S-16^AD-R-16^AD-Q-16^AD-P-16^AD-16" },
            { type: "AD", name: "【TOP MANAGEMENTシリーズ】自己変革と上級管理職・経営層シリーズ（レクチャー編：経営管理 - 決定されたことがどこまで伝わるか -）", target: "AD-V-16^AD-U-16^AD-T-16^AD-S-16^AD-R-16^AD-Q-16^AD-P-16^AD-16" },
            { type: "AD", name: "【TOP MANAGEMENTシリーズ】自己変革と上級管理職・経営層シリーズ（レクチャー編：人と組織構築 - 個人依存からの脱却 -）", target: "AD-V-16^AD-U-16^AD-T-16^AD-S-16^AD-R-16^AD-Q-16^AD-P-16^AD-16" },
            { type: "AD", name: "検討中", target: "AD-V-4^AD-U-4^AD-T-4^AD-S-4^AD-R-4^AD-Q-4^AD-P-4^AD-4" }
          ]
        },
        {
          category: "プロジェクトマネジメント",
          rows: [
            { type: "AD", name: "無理なく無駄なく仕事を進めるためのタスク管理", target: "AD-V-8^AD-U-8^AD-T-8^AD-S-8^AD-R-8^AD-Q-8^AD-P-8^AD-8" },
            { type: "AD", name: "プロジェクトマネジメントの全の全", target: "AD-V-8^AD-U-8^AD-T-8^AD-S-8^AD-R-8^AD-Q-8^AD-P-8^AD-8" },
            { type: "AD", name: "【IT・技術系】はじめてのプロジェクト管理シリーズ（全体編）", target: "AD-V-8^AD-U-8^AD-T-8^AD-S-8^AD-R-8^AD-Q-8^AD-P-8^AD-8" },
            { type: "AD", name: "【IT・技術系】はじめてのプロジェクト管理シリーズ（WBS作成編）", target: "AD-V-8^AD-U-8^AD-T-8^AD-S-8^AD-R-8^AD-Q-8^AD-P-8^AD-8" },
            { type: "AD", name: "【IT・技術系】はじめてのプロジェクト管理シリーズ（進捗管理編）", target: "AD-V-8^AD-U-8^AD-T-8^AD-S-8^AD-R-8^AD-Q-8^AD-P-8^AD-8" },
            { type: "AD", name: "【IT・技術系】はじめてのプロジェクト管理シリーズ（進捗管理編）", target: "AD-V-8^AD-U-8^AD-T-8^AD-S-8^AD-R-8^AD-Q-8^AD-P-8^AD-8" },
            { type: "AD", name: "【IT・技術系】はじめてのプロジェクト管理シリーズ（リスク管理編）", target: "AD-V-8^AD-U-8^AD-T-8^AD-S-8^AD-R-8^AD-Q-8^AD-P-8^AD-8" },
            { type: "AD", name: "ハイパフォーマーになるためのセルフマネジメント術", target: "AD-V-8^AD-U-8^AD-T-8^AD-S-8^AD-R-8^AD-Q-8^AD-P-8^AD-8" },
            { type: "AD", name: "検討中", target: "AD-V-8" }
          ]
        },
        {
          category: "インダストリー（業務）",
          rows: [
            { type: "SC", name: "ITエンジニアのための共通業務知識の基礎", target: "業V-2^業U-2^業T-2^業S-2^業R-2^業Q-2^業P-2^業-2" }
          ]
        },
        {
          category: "プロジェクトマネジメント（技術）",
          rows: [
            { type: "SC", name: "ITベンダーとのプロジェクトアプローチと進行管理 全4回", target: "SC-V-4^SC-U-4^SC-T-4^SC-S-4^SC-R-4^SC-Q-4^SC-P-4^SC-4" },
            { type: "SC", name: "上流工程で活躍したい人のための企画・アプローチ", target: "SC-V-4^SC-U-4^SC-T-4^SC-S-4^SC-R-4^SC-Q-4^SC-P-4^SC-4" },
            { type: "SC", name: "外部設計・内部設計の実践 -Schooで設計してみよう- 全3回", target: "SC-V-4^SC-U-4^SC-T-4^SC-S-4^SC-R-4^SC-Q-4^SC-P-4^SC-4" },
            { type: "SC", name: "現代システム概論 全3回", target: "SC-V-4^SC-U-4^SC-T-4^SC-S-4^SC-R-4^SC-Q-4^SC-P-4^SC-4" },
            { type: "SC", name: "システムエンジニアのための分析力とロジカルシンキング 全3回", target: "SC-V-4^SC-U-4^SC-T-4^SC-S-4^SC-R-4^SC-Q-4^SC-P-4^SC-4" },
            { type: "SC", name: "受託開発のための法律 全2回", target: "SC-V-4^SC-U-4^SC-T-4^SC-S-4^SC-R-4^SC-Q-4^SC-P-4^SC-4" }
          ]
        },
        {
          category: "メソッドロジー（技術）",
          rows: [
            { type: "SC", name: "DevOps -エンジニアが学ぶべきこととその意味- 全1回", target: "AD-V-11^AD-U-11^AD-T-11^AD-S-11^AD-R-11^AD-Q-11^AD-P-11^AD-11" },
            { type: "SC", name: "はじめてのGit 全3回", target: "AD-V-11^AD-U-11^AD-T-11^AD-S-11^AD-R-11^AD-Q-11^AD-P-11^AD-11" },
            { type: "SC", name: "GitHubを使ってデプロイしてみようの実践 全2回", target: "AD-V-11^AD-U-11^AD-T-11^AD-S-11^AD-R-11^AD-Q-11^AD-P-11^AD-11" },
            { type: "SC", name: "スタートアップのCEOが教えてくれた、ITインフラのセキュリティ対策", target: "AD-V-11^AD-U-11^AD-T-11^AD-S-11^AD-R-11^AD-Q-11^AD-P-11^AD-11" }
          ]
        },
        {
          category: "テクノロジー",
          rows: [
            { type: "SC", name: "ネットワーク基礎 Cisco Networking Academy -CCNA ITN- 全6回", target: "SC-V-1^SC-U-1^SC-T-1^SC-S-1^SC-R-1^SC-Q-1^SC-P-1^SC-1" },
            { type: "SC", name: "ネットワーク 基礎 全4回", target: "SC-V-1^SC-U-1^SC-T-1^SC-S-1^SC-R-1^SC-Q-1^SC-P-1^SC-1" },
            { type: "SC", name: "ネットワーク 構成 全6回", target: "SC-V-1^SC-U-1^SC-T-1^SC-S-1^SC-R-1^SC-Q-1^SC-P-1^SC-1" },
            { type: "SC", name: "AWS入門（2025年版） 全8回", target: "SC-V-2^SC-U-2^SC-T-2^SC-S-2^SC-R-2^SC-Q-2^SC-P-2^SC-2" },
            { type: "SC", name: "AWS Lambdaを活用したサーバーレス実践 全5回", target: "SC-V-2^SC-U-2^SC-T-2^SC-S-2^SC-R-2^SC-Q-2^SC-P-2^SC-2" },
            { type: "SC", name: "【2017年版】AWS実践 -よくある構成を実際に構築- 全4回", target: "SC-V-2^SC-U-2^SC-T-2^SC-S-2^SC-R-2^SC-Q-2^SC-P-2^SC-2" },
            { type: "SC", name: "AWSクラウドデザインパターン 全5回", target: "SC-V-2^SC-U-2^SC-T-2^SC-S-2^SC-R-2^SC-Q-2^SC-P-2^SC-2" },
            { type: "SC", name: "【Microsoft Azure 集中講義】Azureクラウドデザインパターン -Webシステムの構築を通して習得するCDP- 全7回", target: "SC-V-2^SC-U-2^SC-T-2^SC-S-2^SC-R-2^SC-Q-2^SC-P-2^SC-2" },
            { type: "SC", name: "Microsoft Azure IaaS講座: 5分で構築するサーバーシステム（2回目） 〜怖くない構築！マシンを動かしてみよう〜 全1回", target: "SC-V-2^SC-U-2^SC-T-2^SC-S-2^SC-R-2^SC-Q-2^SC-P-2^SC-2" },
            { type: "SC", name: "Microsoft Azure IaaS講座: 5分で構築するサーバーシステム（1回目） 〜とにかく仮想マシンを動かしてみよう〜 全1回", target: "SC-V-2^SC-U-2^SC-T-2^SC-S-2^SC-R-2^SC-Q-2^SC-P-2^SC-2" },
            { type: "SC", name: "今さら聞けない DevOps 全3回", target: "SC-V-4^SC-U-4^SC-T-4^SC-S-4^SC-R-4^SC-Q-4^SC-P-4^SC-4" },
            { type: "SC", name: "システム開発のための外部設計・内部設計入門 全3回", target: "SC-V-4^SC-U-4^SC-T-4^SC-S-4^SC-R-4^SC-Q-4^SC-P-4^SC-4" },
            { type: "SC", name: "外部設計・内部設計の実践 -Schooで設計してみよう- 全3回", target: "SC-V-4^SC-U-4^SC-T-4^SC-S-4^SC-R-4^SC-Q-4^SC-P-4^SC-4" },
            { type: "SC", name: "サクッとわかる外部設計入門 全3回", target: "SC-V-4^SC-U-4^SC-T-4^SC-S-4^SC-R-4^SC-Q-4^SC-P-4^SC-4" },
            { type: "SC", name: "サクッとわかる内部設計入門", target: "SC-V-4^SC-U-4^SC-T-4^SC-S-4^SC-R-4^SC-Q-4^SC-P-4^SC-4" },
            { type: "SC", name: "サクっとわかる外部設計入門", target: "SC-V-4^SC-U-4^SC-T-4^SC-S-4^SC-R-4^SC-Q-4^SC-P-4^SC-4" },
            { type: "SC", name: "付加価値を高める自己分析の方法 全1回", target: "SC-V-4^SC-U-4^SC-T-4^SC-S-4^SC-R-4^SC-Q-4^SC-P-4^SC-4" }
          ]
        },
        {
          category: "定義",
          rows: [
            { type: "テクノロジー", name: "業務を遂行するに当たり必要となる技術的スキル。最新技術動向、開発技術、プログラミング技術を習得", target: "" },
            { type: "メソッドロジー", name: "業務を遂行するに当たり必要となる手法・方法論、開発技法等のスキル", target: "" },
            { type: "プロジェクトマネジメント", name: "プロジェクトを遂行するに当たり必要となるスキル。ITスキル標準としてプロジェクトマネジメント協会が推奨するPMBOK（Project Management Body of Knowledge）の知識の体系を推奨する", target: "" },
            { type: "ビジネス/インダストリー", name: "社会の仕組み、企業の成り立ちにおいて知っておくべき知識。業界に特化した業務知識、法令、規則など", target: "" },
            { type: "パーソナル", name: "業務を遂行する際に必要となる人間的能力のスキル", target: "" }
          ]
        }
      ],
      rationale: [
        "各評価項目を設けた根拠については次のとおり",
        "ITネゴシエーションの目的",
        "　システムやソフトウェアの要件、仕様、価格などについて、複数のステークホルダー間で合意を形成する必要があり",
        "　そのために顧客との長期的な関係を構築し、より良い共創関係を築くことが求められることから項目として設定した",
        "　（事前準備→信頼構築→要求事項分析→WinWinの解決策を創出→交渉の実行→双方納得のうえで合意形成）",
        "インダストリの目的",
        "　「産業」を意味する「Industry」を表し、特定の産業分野に特化して開発されたソフトウェアやシステムに現場で従事し",
        "　業務を遂行することから、特定の技術的な課題解決を目的とした素養も必要と考えられる",
        "　製品開発における設計・シミュレーション、製造プロセスの最適化、品質管理の向上を",
        "　特定の産業の業務効率化と生産性向上を図るため必要となるため評価項目として設定した。",
        "　この素養を養い、着任現場の企業の競争力強化やイノベーション促進に貢献することを狙う。"
      ]
    },
  ];

  return (
    <div className="min-h-screen pb-24">
      <SectionHeader title="Certification" subtitle="認定制度説明資料" />
      <div className="space-y-16">
        {pages.map((page, i) => (
          <div key={i} className="bg-white border border-[#141414] p-8 lg:p-12 shadow-[10px_10px_0px_0px_rgba(20,20,20,0.05)]">
            <div className="flex justify-between items-center mb-8 border-b border-[#141414]/10 pb-4">
              <h3 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                <span className="w-8 h-8 bg-[#141414] text-[#F5F5F0] flex items-center justify-center text-sm font-mono">0{i + 1}</span>
                {page.title}
              </h3>
              <span className="font-mono text-xs opacity-40 uppercase tracking-widest">Section {i + 1}</span>
            </div>

            {page.isTable ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[800px]">
                  <thead>
                    <tr>
                      <th className="p-4 border border-[#141414] bg-[#141414]/5 text-[10px] font-bold uppercase tracking-widest text-left w-16">No</th>
                      {page.headers?.map((header, hIdx) => (
                        <th 
                          key={header} 
                          className={`p-4 border border-[#141414] text-[10px] font-bold uppercase tracking-widest text-left transition-colors duration-200 ${hoveredCol === hIdx ? 'bg-[#141414] text-[#F5F5F0]' : 'bg-[#141414]/5'}`}
                          onMouseEnter={() => setHoveredCol(hIdx)}
                          onMouseLeave={() => setHoveredCol(null)}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {page.rows?.map((row, rIdx) => (
                      <tr 
                        key={rIdx} 
                        className={`transition-colors duration-200 ${hoveredRow === rIdx ? 'bg-[#141414]/5' : ''}`}
                        onMouseEnter={() => setHoveredRow(rIdx)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <td className="p-4 border border-[#141414] text-center font-mono text-sm font-bold">{row.id}</td>
                        <td className={`p-6 border border-[#141414] transition-colors duration-200 ${hoveredCol === 0 ? 'bg-[#141414]/5' : ''}`}>
                          <div className="flex items-start gap-4">
                            <div className="mt-1 p-2 bg-[#141414]/5 rounded-lg">{row.icon}</div>
                            <div>
                              <p className="whitespace-pre-wrap font-bold text-sm leading-relaxed">{row.purpose}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`p-6 border border-[#141414] transition-colors duration-200 ${hoveredCol === 1 ? 'bg-[#141414]/5' : ''}`}>
                          <p className="text-sm leading-relaxed opacity-70 font-serif italic">{row.background}</p>
                        </td>
                        <td className={`p-6 border border-[#141414] transition-colors duration-200 ${hoveredCol === 2 ? 'bg-[#141414]/5' : ''}`}>
                          <div className="flex items-start gap-2">
                            <ChevronRight size={14} className="mt-1 flex-shrink-0 opacity-40" />
                            <p className="text-xs font-bold leading-relaxed">{row.effect}</p>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : page.isSteps ? (
              <div className="flex flex-nowrap overflow-x-auto pb-8 gap-4 custom-scrollbar">
                {page.steps?.map((step, sIdx) => (
                  <React.Fragment key={sIdx}>
                    <div className="flex-shrink-0 w-64 group">
                      <div className="bg-[#F5F5F0] border border-[#141414] p-8 h-full transition-all hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(20,20,20,0.1)]">
                        <div className="flex justify-between items-start mb-6">
                          <div className={`w-12 h-12 ${step.color} text-[#F5F5F0] flex items-center justify-center rounded-full font-mono font-bold text-lg shadow-lg`}>
                            {step.id}
                          </div>
                          <div className="opacity-40 group-hover:opacity-100 transition-opacity">
                            {step.icon}
                          </div>
                        </div>
                        <h4 className="text-xl font-bold mb-2 tracking-tight">{step.label}</h4>
                        <p className="text-sm opacity-60 font-serif italic leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                    {sIdx < (page.steps?.length || 0) - 1 && (
                      <div className="flex items-center justify-center flex-shrink-0">
                        <ChevronRight className="opacity-20" size={32} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : page.isRankTable ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-[#F5F5F0]">
                  <thead>
                    <tr className="bg-[#141414] text-[#F5F5F0]">
                      <th className="p-5 border border-[#141414] text-xs font-bold uppercase tracking-widest text-left">ランク</th>
                      <th className="p-5 border border-[#141414] text-xs font-bold uppercase tracking-widest text-left">名称</th>
                      <th className="p-5 border border-[#141414] text-xs font-bold uppercase tracking-widest text-left">対象イメージ</th>
                      <th className="p-5 border border-[#141414] text-xs font-bold uppercase tracking-widest text-left">認定基準</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.ranks?.map((rank, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#141414]/5 transition-colors group">
                        <td className="p-5 border border-[#141414] font-mono font-bold text-sm bg-[#141414]/5 text-[#141414]">{rank.level}</td>
                        <td className="p-5 border border-[#141414] font-bold text-sm text-[#141414]">{rank.name}</td>
                        <td className="p-5 border border-[#141414] text-sm opacity-80 text-[#141414] font-serif italic">{rank.target}</td>
                        <td className="p-5 border border-[#141414] text-sm border-l-4 border-l-[#E63946] bg-white/50">
                          <div className="flex items-start gap-3">
                            <ShieldCheck size={16} className="text-[#E63946] mt-0.5 flex-shrink-0" />
                            <span className="text-[#141414]">{rank.criteria}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-6 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-40">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#F5F5F0] border border-[#141414]"></div>
                    <span>Base 70%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#141414]"></div>
                    <span>Main 25%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#E63946]"></div>
                    <span>Accent 5%</span>
                  </div>
                </div>
              </div>
            ) : page.isSkillMatrix ? (
              <div className="overflow-x-auto border border-[#141414]">
                <table className="w-full border-collapse bg-[#F5F5F0] text-[10px]">
                  <thead>
                    <tr className="bg-[#141414] text-[#F5F5F0]">
                      <th rowSpan={3} className="p-2 border border-[#F5F5F0]/20 w-8">No</th>
                      <th rowSpan={3} className="p-2 border border-[#F5F5F0]/20 w-32">ランク</th>
                      <th rowSpan={3} className="p-2 border border-[#F5F5F0]/20 w-24">名称</th>
                      {page.categories?.map((cat, cIdx) => (
                        <th key={cIdx} colSpan={cat.span} className="p-2 border border-[#F5F5F0]/20 text-center">
                          {cat.name}
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-[#141414]/90 text-[#F5F5F0]">
                      {page.skills?.map((skill, sIdx) => (
                        <th key={sIdx} className="p-2 border border-[#F5F5F0]/20 min-w-[40px] h-40 relative">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="[writing-mode:vertical-rl] text-[9px] whitespace-nowrap">
                              {skill}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-[#141414]/80 text-[#F5F5F0]">
                      {page.skills?.map((_, sIdx) => (
                        <th key={sIdx} className="p-1 border border-[#F5F5F0]/20 text-center font-mono">
                          {sIdx + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {page.rows?.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#141414]/5 transition-colors">
                        <td className="p-2 border border-[#141414]/20 text-center font-mono">{row.no}</td>
                        <td className="p-2 border border-[#141414]/20 font-bold">{row.rank}</td>
                        <td className="p-2 border border-[#141414]/20">{row.name}</td>
                        {row.values?.map((val, vIdx) => (
                          <td 
                            key={vIdx} 
                            className={`p-2 border border-[#141414]/20 text-center font-mono font-bold ${val > 0 ? 'bg-[#E63946]/10 text-[#E63946]' : 'opacity-20'}`}
                          >
                            {val > 0 ? val : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-4 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-40 bg-white/50 border-t border-[#141414]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#F5F5F0] border border-[#141414]"></div>
                    <span>Base 70%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#141414]"></div>
                    <span>Main 25%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#E63946]"></div>
                    <span>Accent 5%</span>
                  </div>
                </div>
              </div>
            ) : page.isDetailedMatrix ? (
              <div className="space-y-12">
                {page.sections?.map((section, sIdx) => (
                  <div key={sIdx} className="overflow-x-auto border border-[#141414]">
                    <div className="bg-[#141414] text-[#F5F5F0] p-3 text-xs font-bold uppercase tracking-widest">
                      {section.category}
                    </div>
                    <table className="w-full border-collapse bg-[#F5F5F0] text-[10px]">
                      <thead>
                        <tr className="bg-[#141414]/10 text-[#141414]">
                          <th className="p-2 border border-[#141414]/20 w-32 text-left">ランク</th>
                          {section.skills?.map((skill, skIdx) => (
                            <th key={skIdx} className="p-2 border border-[#141414]/20 min-w-[40px] h-40 relative">
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="[writing-mode:vertical-rl] text-[9px] whitespace-nowrap">
                                  {skill}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows?.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-[#141414]/5 transition-colors">
                            <td className="p-2 border border-[#141414]/20 font-bold bg-[#141414]/5">{row.rank}</td>
                            {row.values?.map((val, vIdx) => (
                              <td 
                                key={vIdx} 
                                className={`p-2 border border-[#141414]/20 text-center font-mono ${val === '|' ? 'opacity-20' : 'font-bold text-[#E63946]'}`}
                              >
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
                <div className="p-4 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-40 bg-white/50 border-t border-[#141414]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#F5F5F0] border border-[#141414]"></div>
                    <span>Base 70%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#141414]"></div>
                    <span>Main 25%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#E63946]"></div>
                    <span>Accent 5%</span>
                  </div>
                </div>
              </div>
            ) : page.isTrainingList ? (
              <div className="space-y-12">
                {page.sections?.map((section, sIdx) => (
                  <div key={sIdx} className="overflow-x-auto border border-[#141414]">
                    <div className="bg-[#141414] text-[#F5F5F0] p-3 text-[11px] font-bold uppercase tracking-widest">
                      {section.category}
                    </div>
                    <table className="w-full border-collapse bg-[#F5F5F0] text-[10px]">
                      <thead>
                        <tr className="bg-[#141414]/10 text-[#141414]">
                          <th className="p-3 border border-[#141414]/20 w-20 text-left text-[11px] font-bold">レベル</th>
                          <th className="p-3 border border-[#141414]/20 text-left text-[11px] font-bold">講座名</th>
                          <th className="p-3 border border-[#141414]/20 w-1/3 text-left text-[11px] font-bold">対象ランク</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows?.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-[#141414]/5 transition-colors">
                            <td className="p-3 border border-[#141414]/20 font-mono bg-[#141414]/5 text-[11px]">{row.type}</td>
                            <td className="p-3 border border-[#141414]/20 font-bold text-[11px]">{row.name}</td>
                            <td className="p-3 border border-[#141414]/20 font-mono opacity-60 text-[11px]">{row.target}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
                {page.rationale && (
                  <div className="mt-12 p-8 bg-[#141414]/5 border-l-4 border-[#141414] font-serif italic text-sm leading-relaxed space-y-2">
                    {page.rationale.map((line, lIdx) => (
                      <p key={lIdx}>{line}</p>
                    ))}
                  </div>
                )}
                <div className="p-4 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-40 bg-white/50 border-t border-[#141414]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#F5F5F0] border border-[#141414]"></div>
                    <span>Base 70%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#141414]"></div>
                    <span>Main 25%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#E63946]"></div>
                    <span>Accent 5%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="font-serif text-lg leading-relaxed whitespace-pre-wrap italic opacity-80 pl-4 border-l-4 border-[#141414]">
                {page.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MemberMgmtListView({ users, onSelectMember, onAddMember, onDeleteMember }: { 
  users: UserType[], 
  onSelectMember: (id: string) => void,
  onAddMember: () => void,
  onDeleteMember: (id: string) => void
}) {
  return (
    <div>
      <div className="flex justify-between items-end mb-12 border-b border-[#141414] pb-6">
        <div>
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter mb-2 uppercase">Member Management</h1>
          <p className="text-lg italic font-serif opacity-60">成果・課題・性格等の詳細管理</p>
        </div>
        <button 
          onClick={onAddMember}
          className="px-6 py-3 bg-[#141414] text-[#F5F5F0] text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2"
        >
          <Plus size={16} /> メンバを追加
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-[#141414] text-left">
              <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest opacity-40">社員番号</th>
              <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest opacity-40">氏名</th>
              <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest opacity-40">部署名</th>
              <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest opacity-40">現在の業務</th>
              <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest opacity-40 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-[#141414]/10 hover:bg-[#141414]/5 transition-colors group">
                <td className="py-4 px-4 font-mono text-xs">{user.id}</td>
                <td className="py-4 px-4 font-bold cursor-pointer" onClick={() => onSelectMember(user.id)}>{user.name}</td>
                <td className="py-4 px-4 text-sm">{user.department}</td>
                <td className="py-4 px-4 text-xs truncate max-w-[200px]">{user.profile?.currentWork || '未登録'}</td>
                <td className="py-4 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => onSelectMember(user.id)}
                      className="p-2 hover:bg-[#141414] hover:text-[#F5F5F0] transition-colors"
                    >
                      <UserCircle size={16} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMember(user.id);
                      }}
                      className="p-2 hover:bg-red-600 hover:text-white transition-colors text-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Management Guidelines Section */}
      <div className="mt-24 pt-12 border-t-2 border-[#141414]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-12">
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-600 text-white">
                  <Bell size={20} />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">注意喚起</h3>
              </div>
              <div className="bg-white border border-[#141414] p-8 shadow-[10px_10px_0px_0px_rgba(230,57,70,0.1)]">
                <p className="text-sm leading-relaxed font-bold text-red-600 mb-4">
                  情報不足による弊害を歯止める
                </p>
                <ul className="space-y-2 text-xs opacity-70 list-disc pl-4">
                  <li>離職・離任の防止</li>
                  <li>若手が発言を控えてしまう環境の改善</li>
                  <li>人間関係の悪化防止</li>
                </ul>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#141414] text-[#F5F5F0]">
                  <Users size={20} />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">価値観と世代</h3>
              </div>
              <div className="bg-white border border-[#141414] p-8 space-y-4">
                <p className="text-sm leading-relaxed font-bold">
                  価値観が異なる世代が集まっていることを再認識し、同じ目標に向かう
                </p>
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-[#F5F5F0] border-l-4 border-[#141414]">
                    <p className="text-xs leading-relaxed italic font-serif">
                      「価値観は過去の体験から作られたもの。生活習慣も実体験も異なるため、価値観が完全に統一されることはない。」
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-12">
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#141414] text-[#F5F5F0]">
                  <ClipboardCheck size={20} />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">面談・コミュニケーション</h3>
              </div>
              <div className="bg-white border border-[#141414] p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="font-mono text-xl font-bold opacity-20">30s</div>
                    <p className="text-sm leading-relaxed">
                      被評価者が話し始めてから<span className="font-bold underline">30秒は話を遮らない</span>。
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="font-mono text-xl font-bold opacity-20">Wait</div>
                    <p className="text-sm leading-relaxed">
                      自分の経験値を伝えたいと思い立っても我慢する。すぐに解決情報を話さない。
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="font-mono text-xl font-bold opacity-20">Adv</div>
                    <p className="text-sm leading-relaxed">
                      原因がわかってからアドバイスすること。カウンセラーの手法を用いること。
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#141414] text-[#F5F5F0]">
                  <Info size={20} />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">リーダーの心得</h3>
              </div>
              <div className="bg-[#141414] text-[#F5F5F0] p-8 space-y-4">
                <p className="text-sm font-bold leading-relaxed">
                  「部下の声を聞けなくなったらお払い箱」
                </p>
                <p className="text-xs opacity-70 leading-relaxed">
                  進捗や成果が芳しくなくても遮らずに話をさせる。特に20代に対しては、まず<span className="text-red-400 font-bold">「認める」</span>ことが必要不可欠である。
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Maslow's Hierarchy */}
        <div className="mt-24 bg-[#F5F5F0] border border-[#141414] p-8 lg:p-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold tracking-tighter mb-4 uppercase">Maslow's Hierarchy of Needs</h3>
              <p className="text-sm italic font-serif opacity-60">マズローの欲求5段階説</p>
            </div>

            <div className="relative flex flex-col items-center">
              {[
                { id: 5, label: '自己実現欲求', desc: '自分の持つ能力を最大限に発揮したい', color: 'bg-[#141414]', textColor: 'text-white', width: 'w-1/3' },
                { id: 4, label: '承認欲求', desc: '他者から認められたい、尊敬されたい', color: 'bg-[#141414]/90', textColor: 'text-white', width: 'w-1/2' },
                { id: 3, label: '社会的欲求', desc: '集団に属したい、仲間が欲しい', color: 'bg-[#141414]/80', textColor: 'text-white', width: 'w-2/3' },
                { id: 2, label: '安全欲求', desc: '心身の安全、経済的安定を確保したい', color: 'bg-[#141414]/70', textColor: 'text-white', width: 'w-5/6' },
                { id: 1, label: '生理的欲求', desc: '生きていくための本能的な欲求', color: 'bg-[#141414]/60', textColor: 'text-white', width: 'w-full' },
              ].map((level) => (
                <div 
                  key={level.id}
                  className={`${level.width} ${level.color} ${level.textColor} p-4 mb-1 text-center transition-all hover:scale-[1.02] cursor-default border border-[#141414]/10 relative group`}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-40 mb-1">Level {level.id}</span>
                    <span className="font-bold text-sm">{level.label}</span>
                    <div className="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white text-[#141414] p-2 text-[10px] z-10 border border-[#141414] shadow-xl whitespace-nowrap">
                      {level.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="font-bold text-sm border-b border-[#141414] pb-2">成長欲求 (Growth Needs)</h4>
                <p className="text-xs leading-relaxed opacity-70">
                  自己実現欲求。人間が持つ最も高次の欲求であり、自分がなりうるものになろうとする欲求。満たされるほどさらに強い欲求が生まれる。
                </p>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-sm border-b border-[#141414] pb-2">欠乏欲求 (Deficiency Needs)</h4>
                <p className="text-xs leading-relaxed opacity-70">
                  生理的欲求から承認欲求まで。足りないものを満たしたいという欲求であり、満たされないと不安や不満を感じる。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberMgmtDetailView({ user, onBack, onUpdateUser }: { 
  user: UserType, 
  onBack: () => void,
  onUpdateUser: (user: UserType) => void
}) {
  const [profile, setProfile] = useState<MemberProfile>(user.profile || {
    achievements: '',
    challenges: '',
    personality: '',
    careerPath: '',
    currentWork: '',
    interests: '',
    hobbies: '',
    commonMistakes: '',
    remarks: ''
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdateUser({ ...user, profile });
    setIsEditing(false);
  };

  const fields = [
    { key: 'achievements', label: '成果', icon: <Star size={16} /> },
    { key: 'challenges', label: '課題', icon: <Info size={16} /> },
    { key: 'personality', label: '性格', icon: <Users size={16} /> },
    { key: 'careerPath', label: '本人希望キャリアパス', icon: <ChevronRight size={16} /> },
    { key: 'currentWork', label: '現在の業務', icon: <Database size={16} /> },
    { key: 'interests', label: '興味がある分野', icon: <Search size={16} /> },
    { key: 'hobbies', label: '趣味嗜好', icon: <Star size={16} /> },
    { key: 'commonMistakes', label: '起こしやすいミス', icon: <X size={16} /> },
    { key: 'remarks', label: '備考', icon: <Info size={16} /> },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-12">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:gap-3 transition-all">
          <ArrowLeft size={16} /> 戻る
        </button>
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className="px-6 py-3 bg-[#141414] text-[#F5F5F0] text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform"
        >
          {isEditing ? '保存する' : '編集する'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="lg:w-1/3">
          <div className="sticky top-12">
            <div className="w-32 h-32 bg-[#141414] text-[#F5F5F0] flex items-center justify-center text-5xl font-bold mb-6">
              {user.name[0]}
            </div>
            <h1 className="text-5xl font-bold tracking-tighter mb-2">{user.name}</h1>
            <p className="text-xl font-serif italic opacity-60 mb-6">{user.department}</p>
            <div className="pt-6 border-t border-[#141414]">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">社員番号</span>
              <p className="font-mono text-xl">{user.id}</p>
            </div>
          </div>
        </div>

        <div className="lg:w-2/3 grid grid-cols-1 gap-8">
          {fields.map((field) => (
            <div key={field.key} className="bg-white border border-[#141414] p-8">
              <div className="flex items-center gap-2 mb-4 opacity-40">
                {field.icon}
                <span className="text-[10px] font-bold uppercase tracking-widest">{field.label}</span>
              </div>
              {isEditing ? (
                <textarea 
                  value={(profile as any)[field.key]}
                  onChange={(e) => setProfile({ ...profile, [field.key]: e.target.value })}
                  className="w-full bg-[#F5F5F0] border border-[#141414]/10 p-4 text-sm outline-none focus:border-[#141414] min-h-[100px] resize-none font-serif italic"
                  placeholder={`${field.label}を入力してください...`}
                />
              ) : (
                <p className="text-lg leading-relaxed whitespace-pre-wrap">
                  {(profile as any)[field.key] || <span className="opacity-20 italic">未登録</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardView({ users, skills, userSkills, onNavigate, onExport }: { 
  users: UserType[], 
  skills: SkillMaster[], 
  userSkills: UserSkill[],
  onNavigate: (view: View) => void,
  onExport: () => void
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
      .map(([id, count]) => {
        const skill = skills.find(s => s.id === id);
        return skill ? { skill, count } : null;
      })
      .filter((item): item is { skill: SkillMaster, count: number } => item !== null)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [userSkills, skills]);

  return (
    <div>
      <div className="flex justify-between items-end mb-12 border-b border-[#141414] pb-6">
        <div>
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter mb-2 uppercase">Dashboard</h1>
          <p className="text-lg italic font-serif opacity-60">組織のスキル資産の概要</p>
        </div>
        <button 
          onClick={onExport}
          className="no-pdf px-4 py-2 border border-[#141414] text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-[#F5F5F0] transition-all"
        >
          Export PDF
        </button>
      </div>
      
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

function MemberListView({ users, onSelectMember, onExport }: { users: UserType[], onSelectMember: (id: string) => void, onExport: () => void }) {
  return (
    <div>
      <div className="flex justify-between items-end mb-12 border-b border-[#141414] pb-6">
        <div>
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter mb-2 uppercase">Members</h1>
          <p className="text-lg italic font-serif opacity-60">スキルを保有するメンバの一覧</p>
        </div>
        <button 
          onClick={onExport}
          className="no-pdf px-4 py-2 border border-[#141414] text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-[#F5F5F0] transition-all"
        >
          Export PDF
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-[#141414] text-left">
              <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest opacity-40">社員番号</th>
              <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest opacity-40">氏名</th>
              <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest opacity-40">部署名</th>
              <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest opacity-40 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-[#141414]/10 hover:bg-[#141414]/5 transition-colors group">
                <td className="py-4 px-4 font-mono text-xs">{user.id}</td>
                <td className="py-4 px-4 font-bold cursor-pointer" onClick={() => onSelectMember(user.id)}>{user.name}</td>
                <td className="py-4 px-4 text-sm">{user.department}</td>
                <td className="py-4 px-4 text-right">
                  <button 
                    onClick={() => onSelectMember(user.id)}
                    className="p-2 hover:bg-[#141414] hover:text-[#F5F5F0] transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MemberDetailView({ user, skills, onBack, onExport, onUpdateUser }: { 
  user: UserType, 
  skills: any[], 
  onBack: () => void,
  onExport: () => void,
  onUpdateUser: (user: UserType) => void
}) {
  const [isAddingExp, setIsAddingExp] = useState(false);
  const [newExp, setNewExp] = useState({ date: '', description: '' });

  const handleAddExp = () => {
    if (newExp.date && newExp.description) {
      const updatedUser = {
        ...user,
        workExperiences: [...(user.workExperiences || []), newExp]
      };
      onUpdateUser(updatedUser);
      setNewExp({ date: '', description: '' });
      setIsAddingExp(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-8 no-pdf">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:gap-3 transition-all">
          <ArrowLeft size={16} />
          戻る
        </button>
        <button 
          onClick={onExport}
          className="px-4 py-2 border border-[#141414] text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-[#F5F5F0] transition-all"
        >
          Export PDF
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 mb-12">
        <div className="lg:w-1/3">
          <div className="sticky top-12">
            <div className="w-32 h-32 bg-[#141414] text-[#F5F5F0] flex items-center justify-center text-5xl font-bold mb-6">
              {user.name[0]}
            </div>
            <h1 className="text-5xl font-bold tracking-tighter mb-2">{user.name}</h1>
            <p className="text-xl font-serif italic opacity-60 mb-6">{user.department}</p>
            
            <div className="space-y-2 border-t border-[#141414] pt-6 mb-12">
              <div className="flex justify-between text-sm">
                <span className="opacity-50">社員番号</span>
                <span className="font-mono">{user.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-50">登録スキル数</span>
                <span className="font-mono">{skills.length}</span>
              </div>
            </div>

            <div className="border-t border-[#141414] pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">職務経歴</h3>
                <button 
                  onClick={() => setIsAddingExp(!isAddingExp)}
                  className="no-pdf p-1 hover:bg-[#141414]/5 rounded transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              {isAddingExp && (
                <div className="no-pdf mb-6 p-4 bg-white border border-[#141414] space-y-3">
                  <input 
                    type="text" 
                    placeholder="YYYY/MM"
                    value={newExp.date}
                    onChange={(e) => setNewExp({...newExp, date: e.target.value})}
                    className="w-full px-3 py-2 text-xs border border-[#141414]/10 outline-none focus:border-[#141414]"
                  />
                  <textarea 
                    placeholder="職務内容"
                    value={newExp.description}
                    onChange={(e) => setNewExp({...newExp, description: e.target.value})}
                    className="w-full px-3 py-2 text-xs border border-[#141414]/10 outline-none focus:border-[#141414] resize-none"
                    rows={2}
                  />
                  <button 
                    onClick={handleAddExp}
                    className="w-full py-2 bg-[#141414] text-[#F5F5F0] text-[10px] font-bold uppercase tracking-widest"
                  >
                    追加
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {user.workExperiences?.map((exp, i) => (
                  <div key={i} className="border-l-2 border-[#141414] pl-4 py-1">
                    <span className="text-[10px] font-mono opacity-50 block mb-1">{exp.date}</span>
                    <p className="text-xs leading-relaxed">{exp.description}</p>
                  </div>
                )) || <p className="text-xs opacity-40 italic">経歴が登録されていません</p>}
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
  setFilterLevel,
  onExport
}: { 
  entries: any[],
  searchQuery: string,
  setSearchQuery: (q: string) => void,
  filterCategory: string,
  setFilterCategory: (c: string) => void,
  filterLevel: number | 'all',
  setFilterLevel: (l: number | 'all') => void,
  onExport: () => void
}) {
  const [showDefinitions, setShowDefinitions] = useState(false);

  return (
    <div>
      <div className="flex justify-between items-end mb-12 border-b border-[#141414] pb-6">
        <div>
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter mb-2 uppercase">Skill List</h1>
          <p className="text-lg italic font-serif opacity-60">全メンバのスキル習得状況</p>
        </div>
        <button 
          onClick={onExport}
          className="no-pdf px-4 py-2 border border-[#141414] text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-[#F5F5F0] transition-all"
        >
          Export PDF
        </button>
      </div>

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

function AddMemberView({ onAdd }: { onAdd: (user: UserType) => void }) {
  const [formData, setFormData] = useState({ id: '', name: '', department: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.id && formData.name && formData.department) {
      onAdd(formData as UserType);
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

function AddSkillView({ users, skills, onAdd, onAddMaster }: { 
  users: UserType[], 
  skills: SkillMaster[], 
  onAdd: (us: UserSkill) => void,
  onAddMaster: (s: SkillMaster) => void
}) {
  const [formData, setFormData] = useState<UserSkill>({
    userId: '',
    skillId: '',
    level: 1,
    yearsOfExperience: 0,
    remarks: ''
  });

  const [isAddingMaster, setIsAddingMaster] = useState(false);
  const [newMaster, setNewMaster] = useState({ name: '', category: CATEGORIES[0] });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.userId && formData.skillId) {
      onAdd(formData);
    }
  };

  const handleAddMaster = () => {
    if (newMaster.name) {
      const id = `SKILL_${Date.now()}`;
      onAddMaster({ id, ...newMaster });
      setNewMaster({ name: '', category: CATEGORIES[0] });
      setIsAddingMaster(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <SectionHeader title="Register Skill" subtitle="メンバのスキル習得状況を登録" />
      
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">スキルの選択肢を追加</h3>
          <button 
            onClick={() => setIsAddingMaster(!isAddingMaster)}
            className="p-2 border border-[#141414] hover:bg-[#141414] hover:text-[#F5F5F0] transition-all"
          >
            {isAddingMaster ? <X size={16} /> : <Plus size={16} />}
          </button>
        </div>

        {isAddingMaster && (
          <div className="bg-white border border-[#141414] p-6 space-y-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block opacity-40">スキル名</label>
                <input 
                  type="text"
                  value={newMaster.name}
                  onChange={(e) => setNewMaster({...newMaster, name: e.target.value})}
                  className="w-full px-4 py-2 bg-[#F5F5F0] border border-[#141414]/10 focus:border-[#141414] outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block opacity-40">カテゴリ</label>
                <select 
                  value={newMaster.category}
                  onChange={(e) => setNewMaster({...newMaster, category: e.target.value})}
                  className="w-full px-4 py-2 bg-[#F5F5F0] border border-[#141414]/10 focus:border-[#141414] outline-none appearance-none cursor-pointer"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button 
              onClick={handleAddMaster}
              className="w-full py-3 bg-[#141414] text-[#F5F5F0] text-xs font-bold uppercase tracking-widest"
            >
              スキルマスターに追加
            </button>
          </div>
        )}
      </div>

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

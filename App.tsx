
import React, { useState, useMemo, useEffect } from 'react';
const supabase = (window as any).supabase;
import { 
  Users, 
  BarChart3, 
  PlusCircle, 
  Trophy, 
  Trash2, 
  Save, 
  Sparkles,
  FileText,
  Video,
  Music,
  Download,
  Search,
  ThumbsUp,
  Share2,
  MessageSquare,
  RefreshCw,
  Database,
  CheckCircle2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { 
  CategoryType, 
  Contestant, 
  CATEGORY_LABELS 
} from './types';
import { 
  MAX_SCORES, 
  SPECIFIC_CRITERIA_LABELS,
  SOCIAL_EXCHANGE_RATES
} from './constants';

// --- Database Operations ---

async function saveContestantToDB(c: Omit<Contestant, 'id'>) {
  const { data, error } = await supabase.from("contestants").insert({
    name: c.name,
    entry_code: c.entryCode,
    category: c.category,
    general: c.general,
    specific: c.specific,
    social: c.social,
    total_score: c.totalScore,
    ai_feedback: c.aiFeedback,
    created_at: new Date(c.timestamp).toISOString()
  }).select();

  if (error) throw error;
  return data;
}

async function fetchContestantsFromDB(): Promise<Contestant[]> {
  const { data, error } = await supabase
    .from("contestants")
    .select("*")
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map((item: any) => ({
    id: item.id.toString(),
    name: item.name,
    entryCode: item.entry_code,
    category: item.category as CategoryType,
    general: item.general,
    specific: item.specific,
    social: item.social,
    totalScore: item.total_score,
    timestamp: new Date(item.created_at).getTime(),
    aiFeedback: item.ai_feedback
  }));
}

async function deleteContestantFromDB(id: string) {
  const { error } = await supabase.from("contestants").delete().eq("id", id);
  if (error) throw error;
}

// --- Helper Components ---

const SidebarItem: React.FC<{ 
  icon: React.ReactNode, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const ScoreInput: React.FC<{
  label: string;
  value: number;
  max: number;
  onChange: (val: number) => void;
}> = ({ label, value, max, onChange }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center text-xs">
      <label className="font-bold text-slate-700 uppercase tracking-tight">{label}</label>
      <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
        {value}/{max}đ
      </span>
    </div>
    <input 
      type="range"
      min="0"
      max={max}
      step="0.5"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
    />
  </div>
);

const InteractionInput: React.FC<{
  label: string;
  icon: React.ReactNode;
  count: number;
  points: number;
  maxPoints: number;
  rate: number;
  onChange: (count: number) => void;
}> = ({ label, icon, count, points, maxPoints, rate, onChange }) => (
  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-slate-700 font-black text-xs uppercase tracking-tighter">
        {icon}
        {label}
      </div>
      <div className="text-[10px] font-black px-2 py-1 bg-white rounded-lg border border-slate-100 text-blue-600 shadow-sm">
        {points.toFixed(1)} / {maxPoints}đ
      </div>
    </div>
    <div className="relative">
      <input 
        type="number"
        min="0"
        value={count || ''}
        placeholder="0"
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-slate-800 text-lg"
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Lượt</span>
    </div>
    <p className="text-[10px] text-slate-400 italic font-medium">Quy đổi: {rate} lượt = 1đ</p>
  </div>
);

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scoring' | 'list'>('dashboard');
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Scoring Form State
  const [name, setName] = useState('');
  const [entryCode, setEntryCode] = useState('');
  const [category, setCategory] = useState<CategoryType>(CategoryType.VIDEO);
  const [general, setGeneral] = useState({ topic: 0, mention: 0, emotion: 0, message: 0, compliance: 0 });
  const [specific, setSpecific] = useState({ criteria1: 0, criteria2: 0, criteria3: 0 });
  const [socialCounts, setSocialCounts] = useState({ like: 0, share: 0, comment: 0 });

  // Load data logic
  const refreshData = async () => {
    setIsSyncing(true);
    try {
      const data = await fetchContestantsFromDB();
      setContestants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Totals & Points calculations
  const maxTotalScore = useMemo(() => {
    const gen = Object.values(MAX_SCORES.general).reduce((a, b) => a + b, 0);
    const spec = Object.values(MAX_SCORES.specific).reduce((a, b) => a + b, 0);
    const soc = Object.values(MAX_SCORES.social).reduce((a, b) => a + b, 0);
    return gen + spec + soc;
  }, []);

  const socialPoints = useMemo(() => {
    return {
      like: Math.min(MAX_SCORES.social.like, socialCounts.like / SOCIAL_EXCHANGE_RATES.like),
      share: Math.min(MAX_SCORES.social.share, socialCounts.share / SOCIAL_EXCHANGE_RATES.share),
      comment: Math.min(MAX_SCORES.social.comment, socialCounts.comment / SOCIAL_EXCHANGE_RATES.comment)
    };
  }, [socialCounts]);

  const currentTotal = useMemo(() => {
    const genSum = general.topic + general.mention + general.emotion + general.message + general.compliance;
    const specSum = specific.criteria1 + specific.criteria2 + specific.criteria3;
    const socSum = socialPoints.like + socialPoints.share + socialPoints.comment;
    return parseFloat((genSum + specSum + socSum).toFixed(2));
  }, [general, specific, socialPoints]);

  const stats = useMemo(() => {
    const total = contestants.length;
    const avgScore = total > 0 ? contestants.reduce((acc, c) => acc + c.totalScore, 0) / total : 0;
    const topContestant = [...contestants].sort((a, b) => b.totalScore - a.totalScore)[0];
    return { total, avgScore: avgScore.toFixed(1), topContestant };
  }, [contestants]);

  const filteredContestants = useMemo(() => {
    return contestants.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.entryCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contestants, searchQuery]);

  // Main Action: Save
  const handleSaveScore = async () => {
    if (!name || !entryCode) {
      alert("Vui lòng điền đầy đủ tên và mã số!");
      return;
    }

    setIsSaving(true);
    try {
      // Get AI Commentary
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Viết 1 câu nhận xét khích lệ cho bài thi của ${name} (thể loại ${CATEGORY_LABELS[category]}) đạt ${currentTotal}/${maxTotalScore} điểm.`
      });
      const aiFeedback = response.text || "Bài thi rất ấn tượng!";

      const entry = {
        name,
        entryCode,
        category,
        general,
        specific,
        social: {
          likeCount: socialCounts.like,
          shareCount: socialCounts.share,
          commentCount: socialCounts.comment,
          likePoints: socialPoints.like,
          sharePoints: socialPoints.share,
          commentPoints: socialPoints.comment
        },
        totalScore: currentTotal,
        aiFeedback,
        timestamp: Date.now()
      };

      await saveContestantToDB(entry);
      await refreshData(); // Refresh list so dashboard updates
      
      // Success feedback
      alert(`Đã lưu bài thi của ${name} thành công!`);
      
      // Clear and Reset
      setName('');
      setEntryCode('');
      setSocialCounts({ like: 0, share: 0, comment: 0 });
      setGeneral({ topic: 0, mention: 0, emotion: 0, message: 0, compliance: 0 });
      setSpecific({ criteria1: 0, criteria2: 0, criteria3: 0 });
      setActiveTab('dashboard'); // Go to dashboard to see the result

    } catch (err) {
      console.error(err);
      alert("Lỗi khi lưu dữ liệu lên Supabase.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if(confirm("Bạn có chắc muốn xóa vĩnh viễn bài thi này?")) {
      try {
        await deleteContestantFromDB(id);
        await refreshData();
      } catch (err) {
        alert("Lỗi khi xóa.");
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col fixed h-full shadow-sm z-20">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-100">L</div>
          <div>
            <p className="font-black text-sm leading-none">LAGI CITY</p>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Cloud Sync</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem icon={<BarChart3 size={18} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={<PlusCircle size={18} />} label="Chấm bài mới" active={activeTab === 'scoring'} onClick={() => setActiveTab('scoring')} />
          <SidebarItem icon={<Users size={18} />} label="Danh sách bài thi" active={activeTab === 'list'} onClick={() => setActiveTab('list')} />
        </nav>

        <div className="mt-auto space-y-2">
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${isSyncing ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
            <Database size={16} className={isSyncing ? "animate-pulse" : ""} />
            <span className="text-[10px] font-black uppercase tracking-widest">{isSyncing ? "Syncing..." : "Connected"}</span>
          </div>
          <button 
            onClick={refreshData} 
            className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-12 h-screen overflow-y-auto">
        <header className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              {activeTab === 'dashboard' && 'Hệ Thống Tổng Quan'}
              {activeTab === 'scoring' && 'Bắt Đầu Chấm Điểm'}
              {activeTab === 'list' && 'Cơ Sở Dữ Liệu'}
            </h1>
            <p className="text-slate-400 font-bold text-sm mt-2 flex items-center gap-2">
              <Database size={14} /> Dữ liệu trực tuyến từ Supabase Cloud
            </p>
          </div>
          <button 
            onClick={() => setActiveTab('scoring')} 
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
          >
            Chấm Bài Ngay
          </button>
        </header>

        <div className="animate-in fade-in duration-700 slide-in-from-bottom-4">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thí sinh</p>
                  <h3 className="text-4xl font-black">{stats.total}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Điểm Trung Bình</p>
                  <h3 className="text-4xl font-black text-blue-600">{stats.avgScore}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cao nhất</p>
                  <h3 className="text-lg font-black truncate">{stats.topContestant?.name || '---'}</h3>
                  <p className="text-[10px] font-black text-emerald-500 uppercase mt-1">{stats.topContestant?.totalScore} điểm</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center">
                   <div className="text-center">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                         <CheckCircle2 size={24} />
                      </div>
                      <p className="text-[10px] font-black text-emerald-500 uppercase">Hệ thống ổn định</p>
                   </div>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm h-[450px]">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-10">Biểu đồ phân bổ điểm số (Top 8)</h4>
                <div className="h-full pb-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...contestants].sort((a,b) => b.totalScore - a.totalScore).slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="entryCode" axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontSize: 10, fontWeight: 900}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontSize: 10, fontWeight: 900}} domain={[0, maxTotalScore]} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="totalScore" radius={[10, 10, 0, 0]} fill="#3b82f6" barSize={50}>
                        {contestants.map((_, index) => <Cell key={index} fill={index === 0 ? '#3b82f6' : '#f1f5f9'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scoring' && (
            <div className="max-w-4xl mx-auto space-y-8 pb-32">
               <section className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-10">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg"><FileText size={24} /></div>
                     <h2 className="text-2xl font-black">Thông tin cơ bản</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ tên thí sinh</label>
                        <input type="text" placeholder="Nguyễn Văn A" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 transition-all" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã số bài thi</label>
                        <input type="text" placeholder="LG-2024-X" value={entryCode} onChange={(e) => setEntryCode(e.target.value)} className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 transition-all" />
                     </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                     {[CategoryType.VIDEO, CategoryType.ARTICLE, CategoryType.SONG].map(cat => (
                        <button key={cat} onClick={() => setCategory(cat)} className={`flex flex-col items-center gap-2 p-6 rounded-3xl border-2 transition-all ${category === cat ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-50 bg-white text-slate-300 hover:border-slate-100'}`}>
                           {cat === CategoryType.VIDEO ? <Video size={24} /> : cat === CategoryType.ARTICLE ? <FileText size={24} /> : <Music size={24} />}
                           <span className="text-[10px] font-black uppercase tracking-widest">{CATEGORY_LABELS[cat]}</span>
                        </button>
                     ))}
                  </div>
               </section>

               <section className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-10">
                  <div className="flex justify-between items-center">
                     <h2 className="text-2xl font-black">Chi Tiết Điểm Chấm</h2>
                     <span className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">Thang 100đ</span>
                  </div>

                  <div className="space-y-8">
                     <div className="p-8 bg-slate-50 rounded-[32px] space-y-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">I. Tiêu chí chung (60đ)</p>
                        <ScoreInput label="Đúng chủ đề" value={general.topic} max={MAX_SCORES.general.topic} onChange={(v) => setGeneral({...general, topic: v})} />
                        <ScoreInput label="Nhắc đến Lagi City Land" value={general.mention} max={MAX_SCORES.general.mention} onChange={(v) => setGeneral({...general, mention: v})} />
                        <ScoreInput label="Cảm xúc & tính chân thật" value={general.emotion} max={MAX_SCORES.general.emotion} onChange={(v) => setGeneral({...general, emotion: v})} />
                        <ScoreInput label="Thông điệp truyền tải" value={general.message} max={MAX_SCORES.general.message} onChange={(v) => setGeneral({...general, message: v})} />
                        <ScoreInput label="Tuân thủ thể lệ" value={general.compliance} max={MAX_SCORES.general.compliance} onChange={(v) => setGeneral({...general, compliance: v})} />
                     </div>

                     <div className="p-8 bg-blue-50/50 rounded-[32px] space-y-6 border border-blue-100/50">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">II. Tiêu chí riêng (20đ)</p>
                        <ScoreInput label={SPECIFIC_CRITERIA_LABELS[category].c1} value={specific.criteria1} max={MAX_SCORES.specific.criteria1} onChange={(v) => setSpecific({...specific, criteria1: v})} />
                        <ScoreInput label={SPECIFIC_CRITERIA_LABELS[category].c2} value={specific.criteria2} max={MAX_SCORES.specific.criteria2} onChange={(v) => setSpecific({...specific, criteria2: v})} />
                        <ScoreInput label={SPECIFIC_CRITERIA_LABELS[category].c3} value={specific.criteria3} max={MAX_SCORES.specific.criteria3} onChange={(v) => setSpecific({...specific, criteria3: v})} />
                     </div>

                     <div className="p-8 bg-purple-50/50 rounded-[32px] space-y-6 border border-purple-100/50">
                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">III. Tương tác MXH (Công thức mới)</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <InteractionInput label="Like" icon={<ThumbsUp size={14} />} count={socialCounts.like} points={socialPoints.like} maxPoints={MAX_SCORES.social.like} rate={SOCIAL_EXCHANGE_RATES.like} onChange={(v) => setSocialCounts({...socialCounts, like: v})} />
                           <InteractionInput label="Share" icon={<Share2 size={14} />} count={socialCounts.share} points={socialPoints.share} maxPoints={MAX_SCORES.social.share} rate={SOCIAL_EXCHANGE_RATES.share} onChange={(v) => setSocialCounts({...socialCounts, share: v})} />
                           <InteractionInput label="Comment" icon={<MessageSquare size={14} />} count={socialCounts.comment} points={socialPoints.comment} maxPoints={MAX_SCORES.social.comment} rate={SOCIAL_EXCHANGE_RATES.comment} onChange={(v) => setSocialCounts({...socialCounts, comment: v})} />
                        </div>
                     </div>
                  </div>
               </section>

               {/* Persistence Floating Bar */}
               <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 z-30">
                  <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[40px] shadow-2xl border border-white flex items-center justify-between">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng điểm bài thi</span>
                        <div className="flex items-baseline gap-2">
                           <span className="text-6xl font-black text-slate-900 tracking-tighter">{currentTotal}</span>
                           <span className="text-xl font-bold text-slate-300">/ {maxTotalScore}</span>
                        </div>
                     </div>
                     <button 
                        onClick={handleSaveScore} 
                        disabled={isSaving || isSyncing}
                        className="bg-blue-600 text-white h-20 px-12 rounded-3xl font-black text-lg uppercase tracking-widest flex items-center gap-4 hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 disabled:opacity-50 active:scale-95"
                     >
                        {isSaving ? <RefreshCw className="animate-spin" /> : <Save size={24} />}
                        {isSaving ? "Đang lưu..." : "Lưu & Đồng bộ"}
                     </button>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="space-y-8">
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="relative flex-1">
                     <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                     <input type="text" placeholder="Tìm kiếm thí sinh hoặc mã số bài thi..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-16 pr-8 py-5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold" />
                  </div>
               </div>

               <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                           <th className="px-10 py-6">Mã bài thi</th>
                           <th className="px-10 py-6">Thí sinh</th>
                           <th className="px-10 py-6">Thể loại</th>
                           <th className="px-10 py-6 text-center">Tổng điểm</th>
                           <th className="px-10 py-6 text-right">Thao tác</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {filteredContestants.map(c => (
                           <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-10 py-8"><span className="font-mono text-xs font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl uppercase">{c.entryCode}</span></td>
                              <td className="px-10 py-8">
                                 <p className="font-black text-slate-900 text-lg leading-none">{c.name}</p>
                                 <p className="text-[10px] font-bold text-slate-300 uppercase mt-2">{new Date(c.timestamp).toLocaleDateString('vi-VN')}</p>
                              </td>
                              <td className="px-10 py-8">
                                 <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-blue-50 text-blue-500 rounded-lg">{CATEGORY_LABELS[c.category]}</span>
                              </td>
                              <td className="px-10 py-8 text-center"><span className="text-3xl font-black text-slate-900 tracking-tighter">{c.totalScore}</span></td>
                              <td className="px-10 py-8 text-right">
                                 <button onClick={() => handleDelete(c.id)} className="p-4 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={20} /></button>
                              </td>
                           </tr>
                        ))}
                        {filteredContestants.length === 0 && (
                           <tr><td colSpan={5} className="px-10 py-40 text-center text-slate-300 font-black uppercase tracking-widest italic">Cơ sở dữ liệu đang trống</td></tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

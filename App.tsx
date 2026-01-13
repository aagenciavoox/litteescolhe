
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, Book, Idea, BookStatus, IdeaStatus, DashboardStats } from './types';
import { mockDatabase } from './services/mockDatabase';
import Layout from './components/Layout';
import BookCard from './components/BookCard';
import IdeaForm from './components/IdeaForm';
import BookForm from './components/BookForm';
import IdeaDetailModal from './components/IdeaDetailModal';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  Search, Plus, CheckCircle2, AlertCircle, TrendingUp, 
  BookMarked, Lightbulb, Users as UsersIcon, Eye, UserPlus, ShieldCheck, Mail, Lock, User as UserIcon, Sparkles, Loader2, WifiOff
} from 'lucide-react';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  // Login/Register Form State
  const [authFormData, setAuthFormData] = useState({
    nome: '',
    email: '',
    senha: ''
  });

  // Data State
  const [books, setBooks] = useState<Book[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('explore');
  
  // Modals State
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showIdeaDetailModal, setShowIdeaDetailModal] = useState(false);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Todos');

  // Load Data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const db = await mockDatabase.getDB();
        setBooks(db.books);
        setIdeas(db.ideas);
        setUsers(db.users);
        
        // Verifica se realmente buscou do remoto ou se caiu no fallback
        // Como o fallback retorna INITIAL_DATA se não houver nada, podemos apenas setar falso
        setIsOfflineMode(window.location.protocol === 'file:' || !window.navigator.onLine);
      } catch (err) {
        setIsOfflineMode(true);
      } finally {
        setIsLoadingData(false);
      }

      const savedUser = localStorage.getItem('bibliomind_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setActiveTab(user.tipo === UserRole.ADMIN ? 'dashboard' : 'explore');
      }
    };
    fetchData();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.email.toLowerCase() === authFormData.email.toLowerCase());
    
    if (user) {
      if (user.senha !== authFormData.senha) {
        setAuthError('Senha incorreta.');
        return;
      }
      if (!user.ativo) {
        setAuthError('Sua conta está inativa.');
        return;
      }
      setCurrentUser(user);
      localStorage.setItem('bibliomind_user', JSON.stringify(user));
      setActiveTab(user.tipo === UserRole.ADMIN ? 'dashboard' : 'explore');
      setAuthError('');
    } else {
      setAuthError('Email não encontrado.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const newUser = await mockDatabase.registerUser({
        nome: authFormData.nome,
        email: authFormData.email,
        senha: authFormData.senha
      });
      setUsers(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      localStorage.setItem('bibliomind_user', JSON.stringify(newUser));
      setActiveTab('explore');
    } catch (err: any) {
      setAuthError("Erro ao registrar usuário.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('bibliomind_user');
    setAuthFormData({ nome: '', email: '', senha: '' });
    setIsRegistering(false);
  };

  const availableBooks = useMemo(() => {
    if (!currentUser) return [];
    const userIdeas = ideas.filter(i => i.user_id === currentUser.user_id);
    const ideasBookIds = userIdeas.map(i => i.book_id);
    
    return books.filter(b => 
      b.status === BookStatus.ACTIVE && 
      !ideasBookIds.includes(b.book_id) &&
      (searchQuery === '' || b.título.toLowerCase().includes(searchQuery.toLowerCase()) || b.autor.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (selectedGenre === 'Todos' || b.gêneros.includes(selectedGenre))
    );
  }, [books, ideas, currentUser, searchQuery, selectedGenre]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.nome.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  }, [users, userSearchQuery]);

  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    books.forEach(b => b.gêneros.forEach(g => genres.add(g)));
    return ['Todos', ...Array.from(genres)];
  }, [books]);

  const toggleBookStatus = async (book: Book) => {
    const newStatus = book.status === BookStatus.ACTIVE ? BookStatus.PAUSED : BookStatus.ACTIVE;
    const updated = { ...book, status: newStatus };
    setBooks(prev => prev.map(b => b.book_id === book.book_id ? updated : b));
    await mockDatabase.updateBook(updated);
  };

  const toggleBookHighlight = async (book: Book) => {
    const updated = { ...book, destaque: !book.destaque };
    setBooks(prev => prev.map(b => b.book_id === book.book_id ? updated : b));
    await mockDatabase.updateBook(updated);
  };

  const handleUpdateIdeaStatus = async (ideaId: string, status: IdeaStatus) => {
    setIdeas(prev => prev.map(i => i.idea_id === ideaId ? { ...i, status } : i));
    await mockDatabase.updateIdeaStatus(ideaId, status);
    
    if (showIdeaDetailModal) {
      setShowIdeaDetailModal(false);
      setSelectedIdea(null);
    }
  };

  const handleToggleUser = async (userId: string) => {
    const user = users.find(u => u.user_id === userId);
    if (!user) return;
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, ativo: !u.ativo } : u));
    await mockDatabase.toggleUserStatus(userId, user.ativo);
  };

  const handleSubmitIdea = async (ideaData: { text: string; type: string }) => {
    if (selectedBook && currentUser) {
      const newIdea = await mockDatabase.addIdea({
        user_id: currentUser.user_id,
        book_id: selectedBook.book_id,
        ideia_texto: ideaData.text,
        tipo_conteúdo: ideaData.type
      });
      setIdeas(prev => [...prev, newIdea]);
      setShowIdeaModal(false);
      setSelectedBook(null);
    }
  };

  const handleAddBook = async (bookData: Omit<Book, 'book_id' | 'status'>) => {
    const newBook = await mockDatabase.addBook(bookData);
    setBooks(prev => [newBook, ...prev]);
    setShowBookModal(false);
  };

  const dashboardStats: DashboardStats = useMemo(() => {
    return {
      totalBooks: books.length,
      totalIdeas: ideas.length,
      totalUsers: users.length,
      pendingIdeas: ideas.filter(i => i.status === IdeaStatus.NEW).length
    };
  }, [books, ideas, users]);

  const chartData = useMemo(() => {
    const statusCount = {
      [IdeaStatus.NEW]: ideas.filter(i => i.status === IdeaStatus.NEW).length,
      [IdeaStatus.APPROVED]: ideas.filter(i => i.status === IdeaStatus.APPROVED).length,
      [IdeaStatus.REVIEWED]: ideas.filter(i => i.status === IdeaStatus.REVIEWED).length,
    };
    return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  }, [ideas]);

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center gap-6 p-4">
        <div className="relative">
          <Sparkles size={60} className="text-brand-rust animate-pulse" />
          <Loader2 size={80} className="text-brand-sage absolute -top-2.5 -left-2.5 animate-spin" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-serif font-bold text-brand-charcoal mb-2">Sincronizando com a Biblioteca</h1>
          <p className="text-brand-sage font-medium animate-pulse uppercase tracking-[0.2em] text-[10px]">Aguarde um momento...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      user={currentUser || { user_id: '', nome: '', email: '', tipo: UserRole.USER, ativo: true }} 
      onLogout={handleLogout} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
    >
      {/* Offline Alert */}
      {isOfflineMode && (
        <div className="fixed bottom-6 right-6 z-[100] bg-brand-rust text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-500 font-bold text-xs uppercase tracking-widest">
          <WifiOff size={18} />
          Modo Local (Offline)
        </div>
      )}

      {!currentUser ? (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full flex flex-col md:flex-row border-8 border-white animate-in zoom-in duration-500">
            <div className="md:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col justify-center">
              <div className="mb-8">
                <div className="inline-block p-4 bg-brand-rust rounded-2xl text-white mb-6 shadow-xl shadow-brand-rust/30">
                  <Sparkles size={32} />
                </div>
                <h1 className="text-3xl font-serif font-bold text-brand-charcoal mb-2">Litte escolhe</h1>
                <p className="text-brand-sage font-medium">
                  {isRegistering ? 'Crie sua conta corporativa.' : 'Curadoria inteligente para o seu time editorial.'}
                </p>
              </div>
              
              <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
                {isRegistering && (
                  <div>
                    <label className="block text-[10px] font-black text-brand-charcoal/30 uppercase tracking-[0.2em] mb-2 px-1">Nome Completo</label>
                    <input
                      required
                      type="text"
                      className="w-full p-4 bg-brand-cream border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-sage outline-none transition-all font-medium"
                      value={authFormData.nome}
                      onChange={(e) => setAuthFormData({ ...authFormData, nome: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-black text-brand-charcoal/30 uppercase tracking-[0.2em] mb-2 px-1">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full p-4 bg-brand-cream border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-sage outline-none transition-all font-medium"
                    value={authFormData.email}
                    onChange={(e) => setAuthFormData({ ...authFormData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-brand-charcoal/30 uppercase tracking-[0.2em] mb-2 px-1">Senha</label>
                  <input
                    type="password"
                    required
                    className="w-full p-4 bg-brand-cream border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-sage outline-none transition-all font-medium"
                    value={authFormData.senha}
                    onChange={(e) => setAuthFormData({ ...authFormData, senha: e.target.value })}
                  />
                </div>
                {authError && <p className="text-brand-rust text-xs font-bold">{authError}</p>}
                <button className="w-full py-5 bg-brand-forest text-white rounded-2xl text-xs font-black uppercase tracking-[0.3em] hover:bg-brand-charcoal transition-all shadow-xl mt-4">
                  {isRegistering ? 'Cadastrar' : 'Entrar'}
                </button>
              </form>
              <button onClick={() => setIsRegistering(!isRegistering)} className="mt-8 text-xs font-bold text-brand-sage uppercase tracking-widest underline">
                {isRegistering ? 'Já tenho conta' : 'Criar nova conta'}
              </button>
            </div>
            <div className="hidden md:flex md:w-1/2 bg-brand-forest p-16 flex-col justify-center text-white relative overflow-hidden">
               <h2 className="text-4xl font-serif italic leading-tight z-10">"A curadoria é o coração de toda boa narrativa."</h2>
               <div className="absolute top-1/2 -right-20 -translate-y-1/2 w-96 h-96 bg-brand-amber/5 rounded-full blur-[100px]"></div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* O conteúdo das abas permanece o mesmo, conforme definido no App.tsx anterior */}
          {activeTab === 'explore' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-2 border-brand-charcoal/5 pb-10">
                <div className="max-w-xl">
                  <div className="text-brand-rust text-[10px] font-black uppercase tracking-[0.4em] mb-4">Vitrine de Obras</div>
                  <h2 className="text-3xl md:text-5xl font-serif font-bold text-brand-charcoal mb-4">Novo Insight?</h2>
                  <p className="text-brand-sage text-base md:text-lg font-medium leading-relaxed">Escolha um título disponível para registrar sua ideia de conteúdo.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-charcoal/20" size={18} />
                    <input 
                      type="text" 
                      placeholder="Pesquisar..."
                      className="pl-12 pr-6 py-3 bg-white border-2 border-brand-charcoal/5 rounded-2xl outline-none focus:border-brand-sage text-sm w-full md:w-64 font-medium"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <select 
                    className="px-6 py-3 bg-white border-2 border-brand-charcoal/5 rounded-2xl outline-none text-xs font-black uppercase tracking-widest text-brand-forest cursor-pointer"
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                  >
                    {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </header>

              {availableBooks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                  {availableBooks.map(book => (
                    <BookCard 
                      key={book.book_id} 
                      book={book} 
                      onSelect={(b) => {
                        setSelectedBook(b);
                        setShowIdeaModal(true);
                      }} 
                    />
                  ))}
                </div>
              ) : (
                <div className="py-32 flex flex-col items-center justify-center text-center bg-white/50 rounded-[3rem] border-4 border-dashed border-brand-charcoal/5 px-6">
                  <div className="w-20 h-20 bg-brand-cream text-brand-sage rounded-3xl flex items-center justify-center mb-6">
                    <BookMarked size={32} />
                  </div>
                  <h3 className="text-3xl font-serif font-bold text-brand-charcoal">Fim da Lista</h3>
                  <p className="text-brand-sage max-w-sm mt-4 text-lg font-medium">Você já processou todos os livros disponíveis ou nenhum corresponde ao filtro.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'dashboard' && currentUser.tipo === UserRole.ADMIN && (
             <div className="space-y-12 animate-in fade-in duration-700">
               <div className="border-b-2 border-brand-charcoal/5 pb-8 flex items-end justify-between">
                 <div>
                   <div className="text-brand-sage text-[10px] font-black uppercase tracking-[0.4em] mb-4">Painel de Controle</div>
                   <h2 className="text-5xl font-serif font-bold text-brand-charcoal">Visão Geral</h2>
                 </div>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                 {[
                   { label: 'Obras Ativas', value: dashboardStats.totalBooks, icon: BookMarked, color: 'text-brand-sage', bg: 'bg-brand-sage/10' },
                   { label: 'Ideias Totais', value: dashboardStats.totalIdeas, icon: Lightbulb, color: 'text-brand-rust', bg: 'bg-brand-rust/10' },
                   { label: 'Curadores', value: dashboardStats.totalUsers, icon: UsersIcon, color: 'text-brand-forest', bg: 'bg-brand-forest/10' },
                   { label: 'Pendente', value: dashboardStats.pendingIdeas, icon: AlertCircle, color: 'text-brand-amber', bg: 'bg-brand-amber/10' },
                 ].map((stat, i) => (
                   <div key={i} className="bg-white p-8 rounded-[2rem] border-2 border-brand-charcoal/5 shadow-sm transition-all duration-300">
                     <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-6`}>
                       <stat.icon size={20} />
                     </div>
                     <p className="text-[10px] font-black text-brand-charcoal/40 uppercase tracking-widest mb-1">{stat.label}</p>
                     <p className="text-3xl font-bold text-brand-charcoal tracking-tighter">{stat.value}</p>
                   </div>
                 ))}
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                 <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border-2 border-brand-charcoal/5 shadow-sm">
                   <h3 className="text-xl font-serif font-bold text-brand-charcoal mb-10 flex items-center gap-3">
                     <TrendingUp size={24} className="text-brand-rust" /> Fluxo de Ideias
                   </h3>
                   <div className="h-80 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={chartData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEE6D8" />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#89937C', fontWeight: 900}} />
                         <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#89937C', fontWeight: 900}} />
                         <Tooltip cursor={{fill: '#EEE6D8', opacity: 0.5}} contentStyle={{borderRadius: '1rem', border: 'none', backgroundColor: '#1B221F', color: '#EEE6D8'}} />
                         <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={30}>
                           {chartData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={['#2D3E35', '#89937C', '#D47031'][index % 3]} />
                           ))}
                         </Bar>
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                 </div>
                 <div className="bg-brand-charcoal p-10 rounded-[2.5rem] text-white flex flex-col justify-between shadow-xl">
                   <div>
                     <h3 className="text-2xl font-serif font-bold italic mb-6">Performance</h3>
                     <p className="text-white/60 leading-relaxed font-medium">As métricas de engajamento mostram um aumento constante na produção de conteúdo.</p>
                   </div>
                   <div className="mt-12 space-y-4">
                     <div className="flex justify-between text-[9px] uppercase tracking-[0.3em] font-black text-brand-amber">
                       <span>Meta de Curadoria</span>
                       <span>82%</span>
                     </div>
                     <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/5">
                       <div className="bg-brand-amber h-full rounded-full w-[82%]"></div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
          )}

          {activeTab === 'users' && currentUser.tipo === UserRole.ADMIN && (
            <div className="space-y-12 animate-in fade-in duration-500">
               <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-2 border-brand-charcoal/5 pb-10">
                <div>
                  <div className="text-brand-rust text-[10px] font-black uppercase tracking-[0.4em] mb-4">Diretório Profissional</div>
                  <h2 className="text-5xl font-serif font-bold text-brand-charcoal">Gestão de Equipe</h2>
                </div>
                <div className="flex gap-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-charcoal/20" size={18} />
                    <input 
                      type="text" 
                      placeholder="Pesquisar..."
                      className="pl-12 pr-6 py-3 bg-white border-2 border-brand-charcoal/5 rounded-2xl outline-none focus:border-brand-sage text-sm w-full font-medium"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </header>
              <div className="grid grid-cols-1 gap-4">
                {filteredUsers.map(u => (
                  <div key={u.user_id} className="bg-white p-6 rounded-[2rem] border-2 border-brand-charcoal/5 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl text-white ${u.ativo ? 'bg-brand-forest' : 'bg-brand-charcoal/10'}`}>
                        {u.nome.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-brand-charcoal text-xl">{u.nome}</h4>
                        <p className="text-brand-sage text-sm">{u.email}</p>
                      </div>
                    </div>
                    <button onClick={() => handleToggleUser(u.user_id)} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest ${u.ativo ? 'text-brand-rust' : 'bg-brand-forest text-white'}`}>
                      {u.ativo ? 'Desativar' : 'Reativar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'books-admin' && currentUser.tipo === UserRole.ADMIN && (
            <div className="space-y-12 animate-in fade-in duration-500">
              <div className="flex items-center justify-between gap-6 border-b-2 border-brand-charcoal/5 pb-10">
                <h2 className="text-5xl font-serif font-bold text-brand-charcoal">Acervo Editorial</h2>
                <button onClick={() => setShowBookModal(true)} className="bg-brand-forest text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                  <Plus size={18} /> Novo Livro
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                {books.map(book => (
                  <BookCard key={book.book_id} book={book} isAdmin onToggleStatus={toggleBookStatus} onToggleHighlight={toggleBookHighlight} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'ideas-admin' && currentUser.tipo === UserRole.ADMIN && (
            <div className="space-y-12 animate-in fade-in duration-500">
              <div className="border-b-2 border-brand-charcoal/5 pb-10">
                 <h2 className="text-5xl font-serif font-bold text-brand-charcoal">Fila de Curadoria</h2>
              </div>
              <div className="bg-white rounded-[2.5rem] border-4 border-brand-cream overflow-hidden shadow-xl">
                <table className="w-full text-left">
                  <thead className="bg-brand-cream text-brand-sage text-[10px] font-black uppercase tracking-widest">
                    <tr>
                      <th className="px-8 py-6">Curador</th>
                      <th className="px-8 py-6">Livro</th>
                      <th className="px-8 py-6">Status</th>
                      <th className="px-8 py-6">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-cream">
                    {ideas.map(idea => (
                      <tr key={idea.idea_id}>
                        <td className="px-8 py-6 font-bold text-brand-charcoal">{users.find(u => u.user_id === idea.user_id)?.nome}</td>
                        <td className="px-8 py-6 italic text-brand-sage">{books.find(b => b.book_id === idea.book_id)?.título}</td>
                        <td className="px-8 py-6">
                           <span className="text-[9px] px-3 py-1 bg-brand-cream rounded-full font-black uppercase">{idea.status}</span>
                        </td>
                        <td className="px-8 py-6">
                          <button onClick={() => { setSelectedIdea(idea); setShowIdeaDetailModal(true); }} className="text-brand-forest hover:text-brand-rust"><Eye size={20} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showIdeaModal && selectedBook && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-brand-charcoal/80 backdrop-blur-md">
          <IdeaForm book={selectedBook} user={currentUser!} onClose={() => setShowIdeaModal(false)} onSuccess={handleSubmitIdea} />
        </div>
      )}
      {showBookModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-brand-charcoal/80 backdrop-blur-md">
          <BookForm onClose={() => setShowBookModal(false)} onSuccess={handleAddBook} />
        </div>
      )}
      {showIdeaDetailModal && selectedIdea && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-brand-charcoal/80 backdrop-blur-md">
          <IdeaDetailModal 
            idea={selectedIdea} 
            book={books.find(b => b.book_id === selectedIdea.book_id)}
            user={users.find(u => u.user_id === selectedIdea.user_id)}
            onClose={() => setShowIdeaDetailModal(false)} 
            onUpdateStatus={handleUpdateIdeaStatus}
          />
        </div>
      )}
    </Layout>
  );
};

export default App;

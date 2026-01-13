
export enum UserRole {
  ADMIN = 'admin',
  USER = 'usuário'
}

export enum BookStatus {
  ACTIVE = 'ativo',
  PAUSED = 'pausado'
}

export enum IdeaStatus {
  NEW = 'novo',
  APPROVED = 'aprovado',
  REVIEWED = 'revisado'
}

export interface User {
  user_id: string;
  nome: string;
  email: string;
  senha?: string; // Campo opcional para o mock, mas necessário para o fluxo de auth
  tipo: UserRole;
  ativo: boolean;
}

export interface Book {
  book_id: string;
  título: string;
  autor: string;
  capa_url: string;
  sinopse: string;
  gêneros: string[];
  tags: string[];
  data_lançamento: string;
  status: BookStatus;
  destaque: boolean;
}

export interface Idea {
  idea_id: string;
  user_id: string;
  book_id: string;
  ideia_texto: string;
  tipo_conteúdo: string;
  status: IdeaStatus;
  data_envio: string;
}

export interface DashboardStats {
  totalBooks: number;
  totalIdeas: number;
  totalUsers: number;
  pendingIdeas: number;
}

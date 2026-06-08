import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://trabalho-agendamento-ensaios.onrender.com/api';

interface Ensaio {
  id: number;
  empresa_nome: string;
  contato_nome: string;
  contato_telefone: string;
  objetivos: string;
  data_ensaio: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
  fotografo_responsavel: string | null;
  roteirista_responsavel: string | null;
  auxiliar_responsavel: string | null;
  roteiro_texto: string | null;
  roteiro_enviado_em: string | null;
  fotografo_check: boolean;
  fotografo_check_em: string | null;
  auxiliar_check: boolean;
  motivo_cancelamento?: string | null;
}

const STORAGE_KEY = 'arsenal_fotografo_nome';

export default function PainelFotografo() {
  const [nomeFotografo, setNomeFotografo] = useState<string>(() => localStorage.getItem(STORAGE_KEY) || '');
  const [inputNome, setInputNome] = useState('');
  const [ensaios, setEnsaios] = useState<Ensaio[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'concluido' | 'cancelado'>('pendente');
  const [roteiroAberto, setRoteiroAberto] = useState<number | null>(null);
  const [salvando, setSalvando] = useState<number | null>(null);

  const carregarEnsaios = async (nome: string) => {
    try {
      setCarregando(true);
      const res = await axios.get(`${API_URL}/fotografo/ensaios`, { params: { nome } });
      setEnsaios(res.data);
    } catch {
      alert('Erro ao carregar seus ensaios. Verifique sua conexão.');
    } finally {
      setCarregando(false);
    }
  };

  const entrar = () => {
    const nome = inputNome.trim();
    if (!nome) return;
    localStorage.setItem(STORAGE_KEY, nome);
    setNomeFotografo(nome);
    carregarEnsaios(nome);
  };

  const sair = () => {
    localStorage.removeItem(STORAGE_KEY);
    setNomeFotografo('');
    setInputNome('');
    setEnsaios([]);
  };

  useEffect(() => {
    if (nomeFotografo) carregarEnsaios(nomeFotografo);
  }, [nomeFotografo]);

  const confirmarUpload = async (id: number) => {
    try {
      setSalvando(id);
      await axios.patch(`${API_URL}/fotografo/ensaios/${id}/check`, { nome: nomeFotografo });
      setEnsaios(prev => prev.map(e => e.id === id ? { ...e, fotografo_check: true, fotografo_check_em: new Date().toISOString() } : e));
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao confirmar upload.');
    } finally {
      setSalvando(null);
    }
  };

  const desfazerUpload = async (id: number) => {
    try {
      setSalvando(id);
      await axios.patch(`${API_URL}/fotografo/ensaios/${id}/uncheck`, { nome: nomeFotografo });
      setEnsaios(prev => prev.map(e => e.id === id ? { ...e, fotografo_check: false, fotografo_check_em: null } : e));
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao desfazer.');
    } finally {
      setSalvando(null);
    }
  };

  const formatarData = (dataStr: string) => {
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const formatarDataHora = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const ensaiosFiltrados = ensaios.filter(e => {
    const s = (e.status || '').toLowerCase();
    if (filtroStatus === 'pendente') return s !== 'concluído' && s !== 'concluido' && s !== 'cancelado';
    if (filtroStatus === 'concluido') return s === 'concluído' || s === 'concluido';
    if (filtroStatus === 'cancelado') return s === 'cancelado';
    return true;
  });

  // ─── LOGIN ───────────────────────────────────────────────────────────────
  if (!nomeFotografo) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <img src="/Arsenal.png" alt="Arsenal" className="h-12 w-auto object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-2xl">📸</span>
              <h1 className="text-xl font-bold text-white">Painel do Fotógrafo</h1>
            </div>
            <p className="text-slate-400 text-sm mb-6">Digite seu nome exatamente como cadastrado no sistema.</p>
            <input
              type="text"
              placeholder="Seu nome completo"
              value={inputNome}
              onChange={e => setInputNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && entrar()}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-[#0ABAB5] mb-4"
            />
            <button
              onClick={entrar}
              disabled={!inputNome.trim()}
              className="w-full py-3 bg-[#0ABAB5] hover:bg-[#0ABAB5]/90 disabled:opacity-40 text-slate-950 font-bold rounded-lg transition-all cursor-pointer"
            >
              Entrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── PAINEL ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">

      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6 mb-6">
        <div className="flex items-center gap-4">
          <img src="/Arsenal.png" alt="Arsenal" className="h-10 w-auto object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-[#0ABAB5] bg-clip-text text-transparent">
              Painel do Fotógrafo
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Logado como <span className="text-[#0ABAB5] font-semibold">{nomeFotografo}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => carregarEnsaios(nomeFotografo)}
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            🔄 Atualizar
          </button>
          <button
            onClick={sair}
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-red-900/40 hover:text-red-400 text-slate-400 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1 max-w-md">
          {(['todos', 'pendente', 'concluido', 'cancelado'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltroStatus(f)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer capitalize ${
                filtroStatus === f
                  ? f === 'pendente' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  : f === 'concluido' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : f === 'cancelado' ? 'bg-red-950/40 text-red-400 border border-red-900/30'
                  : 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f === 'todos' ? 'Todos' : f === 'pendente' ? 'Pendentes' : f === 'concluido' ? 'Concluídos' : 'Cancelados'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="max-w-6xl mx-auto">
        {carregando ? (
          <div className="text-center text-slate-500 py-16 animate-pulse">Carregando seus ensaios...</div>
        ) : ensaiosFiltrados.length === 0 ? (
          <div className="text-center text-slate-500 border border-dashed border-slate-800 rounded-xl py-16 bg-slate-900/10">
            Nenhum ensaio encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ensaiosFiltrados.map(ensaio => {
              const bloqueado = ensaio.status === 'Concluído' || ensaio.status === 'Cancelado';
              const temRoteiro = !!ensaio.roteiro_texto;
              const roteiroVisivel = roteiroAberto === ensaio.id;

              return (
                <div
                  key={ensaio.id}
                  className={`border rounded-xl p-5 flex flex-col gap-4 transition-all duration-200 shadow-lg ${
                    ensaio.status === 'Cancelado' ? 'bg-red-950/5 border-red-950/20 opacity-60'
                    : ensaio.status === 'Concluído' ? 'bg-slate-900/40 border-slate-900 opacity-70'
                    : 'bg-slate-900 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Cabeçalho */}
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold tracking-wider uppercase text-slate-500">ID #{ensaio.id}</span>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                      ensaio.status === 'Concluído' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : ensaio.status === 'Cancelado' ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {ensaio.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white truncate">{ensaio.empresa_nome}</h3>
                    <p className="text-sm text-slate-400">Contato: <span className="text-slate-300 font-medium">{ensaio.contato_nome}</span></p>
                  </div>

                  {/* Data/Hora */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800/50">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Data</span>
                      <span className="text-sm font-semibold text-slate-200">{formatarData(ensaio.data_ensaio)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Horário</span>
                      <span className="text-sm font-semibold text-slate-200">
                        {ensaio.hora_inicio.substring(0, 5)} – {ensaio.hora_fim.substring(0, 5)}
                      </span>
                    </div>
                  </div>

                  {/* Briefing */}
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Briefing do Cliente</span>
                    <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-950 line-clamp-3 leading-relaxed">
                      {ensaio.objetivos}
                    </p>
                  </div>

                  {/* Motivo cancelamento */}
                  {ensaio.status === 'Cancelado' && ensaio.motivo_cancelamento && (
                    <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-3">
                      <span className="block text-[10px] uppercase tracking-wider text-red-400 font-bold mb-0.5">Motivo do Cancelamento</span>
                      <p className="text-xs text-slate-300 italic">"{ensaio.motivo_cancelamento}"</p>
                    </div>
                  )}

                  {/* Equipe */}
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-850 text-xs space-y-1">
                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Equipe</span>
                    <p className="text-slate-400">📸 <span className="text-[#0ABAB5] font-semibold">{ensaio.fotografo_responsavel || '—'}</span> (você)</p>
                    <p className="text-slate-400">✍️ {ensaio.roteirista_responsavel || '—'}</p>
                    <p className="text-slate-400">💼 {ensaio.auxiliar_responsavel || '—'}</p>
                  </div>

                  {/* Roteiro */}
                  <div className="border border-slate-800 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setRoteiroAberto(roteiroVisivel ? null : ensaio.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                        temRoteiro
                          ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
                          : 'bg-slate-950/60 text-slate-500 hover:text-slate-400'
                      }`}
                    >
                      <span>{temRoteiro ? '📋 Ver Roteiro do Ensaio' : '📋 Roteiro ainda não enviado'}</span>
                      <span>{roteiroVisivel ? '▲' : '▼'}</span>
                    </button>
                    {roteiroVisivel && temRoteiro && (
                      <div className="bg-slate-950 p-4 border-t border-slate-800">
                        {ensaio.roteiro_enviado_em && (
                          <p className="text-[10px] text-slate-500 mb-2">
                            Enviado em {formatarDataHora(ensaio.roteiro_enviado_em)} por {ensaio.roteirista_responsavel}
                          </p>
                        )}
                        <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {ensaio.roteiro_texto}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Checkpoint de Upload */}
                  {!bloqueado && (
                    <div className={`rounded-lg p-3 border transition-all ${
                      ensaio.fotografo_check
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : 'bg-slate-950/40 border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Minha Entrega</span>
                        {ensaio.fotografo_check && ensaio.fotografo_check_em && (
                          <span className="text-[10px] text-emerald-500">{formatarDataHora(ensaio.fotografo_check_em)}</span>
                        )}
                      </div>

                      {ensaio.fotografo_check ? (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                            <span>✅</span> Arquivos enviados e confirmados
                          </p>
                          <button
                            onClick={() => desfazerUpload(ensaio.id)}
                            disabled={salvando === ensaio.id}
                            className="text-[10px] text-slate-500 hover:text-red-400 underline transition-all cursor-pointer disabled:opacity-50"
                          >
                            desfazer
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-slate-400 mb-2">
                            Após fazer o upload dos arquivos do ensaio na pasta correta, confirme aqui.
                          </p>
                          <button
                            onClick={() => confirmarUpload(ensaio.id)}
                            disabled={salvando === ensaio.id}
                            className="w-full py-2 bg-[#0ABAB5]/10 hover:bg-[#0ABAB5]/20 border border-[#0ABAB5]/30 text-[#0ABAB5] text-[11px] rounded transition-all font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                          >
                            {salvando === ensaio.id ? 'Confirmando...' : '☁️ Confirmar Upload dos Arquivos'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/${ensaio.contato_telefone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-center text-xs py-2 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg font-medium transition-all"
                  >
                    💬 Falar com o Cliente
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
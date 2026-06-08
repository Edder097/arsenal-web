import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://trabalho-agendamento-ensaios.onrender.com/api';

interface Ensaio {
  id: number;
  empresa_nome: string;
  contato_nome: string;
  contato_telefone: string;
  email_cliente: string;
  objetivos: string;
  data_ensaio: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
  fotografo_responsavel: string | null;
  roteirista_responsavel: string | null;
  auxiliar_responsavel: string | null;
  motivo_cancelamento?: string | null;
  
  // 🚀 SEUS NOVOS CAMPOS DO BANCO DE DADOS:
  link_roteiro: string | null;              // Inserido pelo Roteirista
  link_arquivos_ensaio: string | null;      // Inserido pelo Filmmaker (indica que subiu os conteúdos)
  link_materiais_auxiliares: string | null; // Inserido pelo Auxiliar
}

interface MembroEquipe {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  eh_fotografo: boolean;
  eh_roteirista: boolean;
  eh_auxiliar: boolean;
}

export default function FilmmakerPainel() {
  const [ensaios, setEnsaios] = useState<Ensaio[]>([]);
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroProfissional, setFiltroProfissional] = useState<string>('');
  
  // Estado para gerenciar as abas de status
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'concluido' | 'cancelado'>('todos');

  const [equipeEditando, setEquipeEditando] = useState<{[key: number]: { fotografo: string, roteirista: string, auxiliar: string }}>({});

  const carregarDadosIniciais = async () => {
    try {
      setCarregando(true);
      
      const [resEnsaios, resEquipe] = await Promise.all([
        axios.get(`${API_URL}/painel/ensaios`),
        axios.get(`${API_URL}/painel/equipe`)
      ]);

      setEnsaios(resEnsaios.data);
      setEquipe(resEquipe.data);
      
      const dadosInputs: any = {};
      resEnsaios.data.forEach((ensaio: Ensaio) => {
        dadosInputs[ensaio.id] = {
          fotografo: ensaio.fotografo_responsavel || '',
          roteirista: ensaio.roteirista_responsavel || '',
          auxiliar: ensaio.auxiliar_responsavel || ''
        };
      });
      setEquipeEditando(dadosInputs);
    } catch (error) {
      alert('Erro ao carregar os dados do painel.');
    } finally {
      setCarregando(false);
    }
  };

  const salvarEquipe = async (id: number) => {
    try {
      const valores = equipeEditando[id];
      const fotografo = valores.fotografo;
      const roteirista = valores.roteirista;
      const auxiliar = valores.auxiliar;

      // Validações de acúmulo de função removidas daqui para permitir múltiplas escalações

      await axios.patch(`${API_URL}/painel/ensaios/${id}/status`, {
        fotografo_responsavel: fotografo,
        roteirista_responsavel: roteirista,
        auxiliar_responsavel: auxiliar
      });
      
      alert('Equipe escalada com sucesso!');
      
      setEnsaios(prev => prev.map(e => e.id === id ? {
        ...e,
        fotografo_responsavel: fotografo,
        roteirista_responsavel: roteirista,
        auxiliar_responsavel: auxiliar
      } : e));
    } catch (error) {
      alert('Erro ao salvar os responsáveis da equipe.');
    }
  };

  const marcarComoConcluido = async (id: number) => {
    try {
      await axios.patch(`${API_URL}/painel/ensaios/${id}/status`, { status: 'Concluído' });
      setEnsaios(prev =>
        prev.map(ensaio => (ensaio.id === id ? { ...ensaio, status: 'Concluído' } : ensaio))
      );
    } catch (error) {
      alert('Erro ao atualizar o status do ensaio.');
    }
  };

  const cancelarEnsaio = async (id: number) => {
    const motivo = prompt("Por favor, digite o motivo do cancelamento deste ensaio:");
    
    if (motivo === null) return; 
    if (!motivo.trim()) {
      alert("⚠️ É obrigatório preencher o motivo para cancelar o ensaio.");
      return;
    }

    try {
      await axios.patch(`${API_URL}/painel/ensaios/${id}/status`, { 
        status: 'Cancelado',
        motivo_cancelamento: motivo 
      });

      setEnsaios(prev =>
        prev.map(ensaio => (ensaio.id === id ? { ...ensaio, status: 'Cancelado', motivo_cancelamento: motivo } : ensaio))
      );
      alert('Ensaio cancelado com sucesso.');
    } catch (error) {
      alert('Erro ao cancelar o ensaio.');
    }
  };

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const formatarData = (dataStr: string) => {
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const handleSelectChange = (id: number, campo: 'fotografo' | 'roteirista' | 'auxiliar', valor: string) => {
    setEquipeEditando(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [campo]: valor
      }
    }));
  };

  const fotografosDisponiveis = equipe.filter(m => m.eh_fotografo === true);
  const roteiristasDisponiveis = equipe.filter(m => m.eh_roteirista === true);
  const auxiliaresDisponiveis = equipe.filter(m => m.eh_auxiliar === true);

  const ensaiosFiltrados = ensaios.filter(ensaio => {
    const atendeProfissional = !filtroProfissional || (
      ensaio.fotografo_responsavel === filtroProfissional ||
      ensaio.roteirista_responsavel === filtroProfissional ||
      ensaio.auxiliar_responsavel === filtroProfissional
    );

    const statusNormalizado = (ensaio.status || '').trim().toLowerCase();

    let atendeStatus = true;
    if (filtroStatus === 'pendente') {
      atendeStatus = statusNormalizado !== 'concluído' && statusNormalizado !== 'concluido' && statusNormalizado !== 'cancelado';
    } else if (filtroStatus === 'concluido') {
      atendeStatus = statusNormalizado === 'concluído' || statusNormalizado === 'concluido';
    } else if (filtroStatus === 'cancelado') {
      atendeStatus = statusNormalizado === 'cancelado';
    }

    return atendeProfissional && atendeStatus;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      
      {/* Header com a Logomarca PNG */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <img 
            src="/Arsenal.png" 
            alt="Logo Arsenal" 
            className="h-12 w-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-[#0ABAB5] bg-clip-text text-transparent">
              Cronograma de Production
            </h1>
            <p className="text-slate-400 text-sm mt-1">Painel operacional para filmmakers e editores do Arsenal Connect</p>
          </div>
        </div>
        <button 
          onClick={carregarDadosIniciais}
          className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-200 rounded-lg text-xs font-semibold tracking-wide shadow-sm transition-all cursor-pointer"
        >
          🔄 Atualizar Agenda
        </button>
      </div>

      {/* Área de Filtros e Seleções */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col gap-4">
        
        {/* Filtro por Integrante */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-3 shadow-md">
          <div className="w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block sm:inline">Filtrar por Integrante:</span>
          </div>
          <div className="w-full sm:w-64">
            <select
              value={filtroProfissional}
              onChange={(e) => setFiltroProfissional(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#0ABAB5] appearance-none cursor-pointer"
            >
              <option value="">👥 Todos os agendamentos da agência</option>
              {equipe.map(membro => (
                <option key={membro.id} value={membro.nome}>
                  {membro.nome}
                </option>
              ))}
            </select>
          </div>
          {filtroProfissional && (
            <button
              onClick={() => setFiltroProfissional('')}
              className="text-xs text-[#0ABAB5] hover:text-[#0ABAB5]/80 transition-all underline font-medium"
            >
              Limpar Filtro
            </button>
          )}
        </div>

        {/* Abas de Status */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1 max-w-lg shadow-inner">
          <button
            type="button"
            onClick={() => setFiltroStatus('todos')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filtroStatus === 'todos'
                ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus('pendente')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filtroStatus === 'pendente'
                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            Pendentes
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus('concluido')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filtroStatus === 'concluido'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            Concluídos
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus('cancelado')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filtroStatus === 'cancelado'
                ? 'bg-red-950/40 text-red-400 border border-red-900/30 shadow-sm'
                : 'text-slate-400 hover:text-red-400'
            }`}
          >
            Cancelados
          </button>
        </div>

      </div>

      {/* Conteúdo Principal (Grid de Missões) */}
      <div className="max-w-7xl mx-auto">
        {carregando ? (
          <div className="text-center text-slate-500 py-12 animate-pulse font-medium">Carregando missões da semana...</div>
        ) : ensaiosFiltrados.length === 0 ? (
          <div className="text-center text-slate-500 border border-dashed border-slate-800 rounded-xl py-16 bg-slate-900/10">
            Nenhum ensaio encontrado para os critérios selecionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ensaiosFiltrados.map((ensaio) => {
              const inputs = equipeEditando[ensaio.id] || { fotografo: '', roteirista: '', auxiliar: '' };
              const estaBloqueado = ensaio.status === 'Concluído' || ensaio.status === 'Cancelado';
              
              return (
                <div 
                  key={ensaio.id} 
                  className={`border rounded-xl p-5 flex flex-col justify-between transition-all duration-200 shadow-lg ${
                    ensaio.status === 'Cancelado'
                      ? 'bg-red-950/5 border-red-950/20 opacity-60'
                      : ensaio.status === 'Concluído' 
                        ? 'bg-slate-900/40 border-slate-900 opacity-60' 
                        : 'bg-slate-900 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className="text-xs font-bold tracking-wider uppercase text-slate-500">
                        ID #{ensaio.id}
                      </span>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                        ensaio.status === 'Concluído' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : ensaio.status === 'Cancelado'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {ensaio.status}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1 truncate">{ensaio.empresa_nome}</h3>
                    <p className="text-sm text-slate-400 mb-4">Contato: <span className="text-slate-300 font-medium">{ensaio.contato_nome}</span></p>

                    {/* Data e Hora */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800/50 mb-4">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Data</span>
                        <span className="text-sm font-semibold text-slate-200">{formatarData(ensaio.data_ensaio)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Horário</span>
                        <span className="text-sm font-semibold text-slate-200">
                          {ensaio.hora_inicio.substring(0, 5)} - {ensaio.hora_fim.substring(0, 5)}
                        </span>
                      </div>
                    </div>

                    {/* Briefing */}
                    <div className="mb-4">
                      <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Briefing</span>
                      <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-950 text-left line-clamp-3 leading-relaxed">
                        {ensaio.objetivos}
                      </p>
                    </div>

                    {/* Exibe o motivo se estiver cancelado */}
                    {ensaio.status === 'Cancelado' && ensaio.motivo_cancelamento && (
                      <div className="mb-4 bg-red-950/20 border border-red-900/30 rounded-lg p-3 text-left">
                        <span className="block text-[10px] uppercase tracking-wider text-red-400 font-bold mb-0.5">Motivo do Cancelamento</span>
                        <p className="text-xs text-slate-300 italic">"{ensaio.motivo_cancelamento}"</p>
                      </div>
                    )}

                    {/* Form de Escalação de Equipe */}
                    <div className="space-y-2.5 bg-slate-950/50 p-3 rounded-lg border border-slate-850 mb-6">
                      <div className="flex justify-between items-center mb-1">
                        <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">Equipe Escalada</span>
                        {estaBloqueado && (
                          <span className="text-[10px] text-slate-500 font-medium italic">🔒 Registro Travado</span>
                        )}
                      </div>
                      
                      {/* Select Fotógrafo */}
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">📸 Fotógrafo(a) / Filmmaker</label>
                        <select 
                          value={inputs.fotografo}
                          disabled={estaBloqueado}
                          onChange={(e) => handleSelectChange(ensaio.id, 'fotografo', e.target.value)}
                          className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-[#0ABAB5] appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <option value="">Selecione um professional...</option>
                          {fotografosDisponiveis.map(f => (
                            <option key={f.id} value={f.nome}>{f.nome}</option>
                          ))}
                        </select>
                      </div>

                      {/* Select Roteirista */}
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">✍️ Roteirista</label>
                        <select 
                          value={inputs.roteirista}
                          disabled={estaBloqueado}
                          onChange={(e) => handleSelectChange(ensaio.id, 'roteirista', e.target.value)}
                          className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-[#0ABAB5] appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <option value="">Selecione um professional...</option>
                          {roteiristasDisponiveis.map(r => (
                            <option key={r.id} value={r.nome}>{r.nome}</option>
                          ))}
                        </select>
                      </div>

                      {/* Select Auxiliar */}
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">💼 Auxiliar</label>
                        <select 
                          value={inputs.auxiliar}
                          disabled={estaBloqueado}
                          onChange={(e) => handleSelectChange(ensaio.id, 'auxiliar', e.target.value)}
                          className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-[#0ABAB5] appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <option value="">Selecione um professional...</option>
                          {auxiliaresDisponiveis.map(a => (
                            <option key={a.id} value={a.nome}>{a.nome}</option>
                          ))}
                        </select>
                      </div>

                      {!estaBloqueado ? (
                        <button
                          type="button"
                          onClick={() => salvarEquipe(ensaio.id)}
                          className="w-full mt-2 py-2 bg-[#0ABAB5]/10 hover:bg-[#0ABAB5]/20 border border-[#0ABAB5]/30 text-[#0ABAB5] text-[11px] rounded transition-all font-bold uppercase tracking-wider cursor-pointer"
                        >
                          💾 Confirmar Escalação
                        </button>
                      ) : (
                        <div className="w-full mt-2 py-1.5 bg-slate-900/40 text-center text-slate-600 text-[11px] border border-slate-950 rounded font-medium">
                          Edição bloqueada para este ensaio
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div className="pt-2 border-t border-slate-800/60 mt-auto flex flex-col gap-2">
                    <a 
                      href={`https://wa.me/${ensaio.contato_telefone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-center text-xs py-2 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg font-medium transition-all"
                    >
                      💬 Chamar no WhatsApp
                    </a>
                    
                    {!estaBloqueado && (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => marcarComoConcluido(ensaio.id)}
                          className="w-full text-xs font-bold py-2 bg-white hover:bg-slate-200 text-slate-950 rounded-lg transition-all cursor-pointer uppercase tracking-wide shadow-md"
                        >
                          ✓ Marcar como Concluído
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => cancelarEnsaio(ensaio.id)}
                          className="w-full text-xs font-semibold py-2 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/40 rounded-lg transition-all cursor-pointer"
                        >
                          🛑 Cancelar Ensaio
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
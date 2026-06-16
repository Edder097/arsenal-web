import React, { useEffect, useState } from 'react';

interface Ensaio {
  id: number;
  empresa_nome: string;
  data_ensaio: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
  fotografo_responsavel: string;
  roteirista_responsavel: string;
  auxiliar_responsavel: string;
  link_roteiro: string;
  link_arquivos_ensaio: string;
  link_materiais_auxiliares: string;
}

interface TrabalhoMembro {
  id: number;
  empresa_nome: string;
  data_ensaio: string;
  hora_inicio: string;
  status: string;
  papel: 'Filmmaker' | 'Roteirista' | 'Auxiliar Técnico';
}

interface MembroDashboard {
  id: number;
  nome: string;
  email: string;
  totais: {
    total: number;
    concluidos: number;
    agendados: number;
    filmmaker: number;
    roteirista: number;
    auxiliar: number;
  };
  trabalhos: TrabalhoMembro[];
}

export default function PainelEquipeDinamico() {
  const [usuario, setUsuario] = useState<{ id: number; nome: string; email: string } | null>(() => {
    const salvo = localStorage.getItem('arsenal_usuario');
    return salvo ? JSON.parse(salvo) : null;
  });
  
  const [emailInput, setEmailInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [erroLogin, setErroLogin] = useState('');
  const [carregandoLogin, setCarregandoLogin] = useState(false);

  const [ensaios, setEnsaios] = useState<Ensaio[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>('Todos'); // 🟢 NOVO ESTADO: Filtro selecionado
  const [linksEditados, setLinksEditados] = useState<{ [key: string]: string }>({});
  const [salvandoId, setSalvandoId] = useState<number | null>(null);

  // 🟢 ESTADOS DO DASHBOARD DO GERENTE
  const [abaPrincipal, setAbaPrincipal] = useState<'ensaios' | 'dashboard'>('ensaios');
  const [dashboardEquipe, setDashboardEquipe] = useState<MembroDashboard[]>([]);
  const [carregandoDashboard, setCarregandoDashboard] = useState(false);
  const [membroExpandido, setMembroExpandido] = useState<number | null>(null);

  // Filtro de mês: começa no mês atual
  const hoje = new Date();
  const [mesAtivo, setMesAtivo] = useState<{ mes: number; ano: number }>({
    mes: hoje.getMonth() + 1, // 1–12
    ano: hoje.getFullYear(),
  });

  const isGerente = usuario?.email === 'gabrielafonso.arsenal@gmail.com';

  const API_URL = import.meta.env.VITE_API_URL || '';
  const BASE_URL = API_URL.endsWith('/api') ? API_URL : (API_URL ? `${API_URL}/api` : '/api');

useEffect(() => {
  if (!usuario) return;

  const carregarEnsaios = async () => {
    try {
      // 🟢 O PULO DO GATO: Se for o e-mail do Gabriel, puxa a rota geral. Se não, puxa filtrado por colaborador.
      const url = usuario.email === 'gabrielafonso.arsenal@gmail.com'
        ? `${BASE_URL}/painel/ensaios`
        : `${BASE_URL}/painel/meus-ensaios?nomeColaborador=${encodeURIComponent(usuario.nome)}`;

      const res = await fetch(url);
      const dados = await res.json();
      
      if (res.ok) {
        setEnsaios(dados);
        
        // Mantém sua lógica idêntica para preencher os inputs de links na tela
        const mapaLinks: { [key: string]: string } = {};
        dados.forEach((e: Ensaio) => {
          mapaLinks[`${e.id}-link_roteiro`] = e.link_roteiro || '';
          mapaLinks[`${e.id}-link_arquivos_ensaio`] = e.link_arquivos_ensaio || '';
          mapaLinks[`${e.id}-link_materiais_auxiliares`] = e.link_materiais_auxiliares || '';
        });
        setLinksEditados(mapaLinks);
      }
    } catch (err) {
      console.error('Erro ao buscar ensaios:', err);
    }
  };
  
  carregarEnsaios();
}, [usuario, BASE_URL]);

  // 🟢 CARREGA O DASHBOARD QUANDO O GERENTE ABRE ESSA ABA
  useEffect(() => {
    if (!isGerente || abaPrincipal !== 'dashboard') return;
    const carregarDashboard = async () => {
      setCarregandoDashboard(true);
      try {
        const res = await fetch(`${BASE_URL}/painel/dashboard/equipe`);
        const dados = await res.json();
        if (res.ok) setDashboardEquipe(dados);
      } catch (err) {
        console.error('Erro ao buscar dashboard:', err);
      } finally {
        setCarregandoDashboard(false);
      }
    };
    carregarDashboard();
  }, [isGerente, abaPrincipal, BASE_URL]);

  const lidarComLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregandoLogin(true);
    setErroLogin('');
    
    try {
      const res = await fetch(`${BASE_URL}/painel/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: emailInput,
          senha: senhaInput
        }),
      });
      
      const dados = await res.json();
      
      if (res.ok) {
        localStorage.setItem('arsenal_usuario', JSON.stringify(dados));
        setUsuario(dados);
      } else {
        setErroLogin(dados.error || 'Colaborador não encontrado.');
      }
    } catch (err) {
      setErroLogin('Erro de conexão com o servidor.');
    } finally {
      setCarregandoLogin(false);
    }
  };

  const onLogout = () => {
    localStorage.removeItem('arsenal_usuario');
    setUsuario(null);
    setEnsaios([]);
    setFiltroStatus('Todos'); // Reseta o filtro no logout
    setAbaPrincipal('ensaios');
    setDashboardEquipe([]);
    setMembroExpandido(null);
    const agora = new Date();
    setMesAtivo({ mes: agora.getMonth() + 1, ano: agora.getFullYear() });
    setEmailInput('');
    setSenhaInput('');
  };

  const lidarComMudancaInput = (ensaioId: number, campo: string, valor: string) => {
    setLinksEditados(prev => ({ ...prev, [`${ensaioId}-${campo}`]: valor }));
  };

  const salvarLinkNoBanco = async (ensaioId: number, campo: string) => {
    setSalvandoId(ensaioId);
    const valorDoLink = linksEditados[`${ensaioId}-${campo}`];

    try {
      const res = await fetch(`${BASE_URL}/painel/ensaios/${ensaioId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [campo]: valorDoLink })
      });

      const dados = await res.json();

      if (res.ok) {
        alert('Link atualizado com sucesso!');
        setEnsaios(prev => prev.map(ens => 
          ens.id === ensaioId ? { ...ens, ...dados.ensaio } : ens
        ));
      } else {
        alert('Erro ao salvar o link.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar.');
    } finally {
      setSalvandoId(null);
    }
  };

  const lidarComUploadRoteiro = async (ensaioId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivos = e.target.files;
    if (!arquivos || arquivos.length === 0) return;

    const arquivoSelecionado = arquivos[0];
    if (arquivoSelecionado.type !== 'application/pdf') {
      alert('Por favor, selecione apenas arquivos no formato PDF.');
      return;
    }

    setSalvandoId(ensaioId);
    const formData = new FormData();
    formData.append('roteiro', arquivoSelecionado);

    try {
      const res = await fetch(`${BASE_URL}/painel/ensaios/${ensaioId}/roteiro`, {
        method: 'PATCH',
        body: formData,
      });

      const dados = await res.json();

      if (res.ok) {
        alert('Roteiro em PDF enviado e atualizado com sucesso!');
        setEnsaios(prev => prev.map(ens => ens.id === ensaioId ? { ...ens, link_roteiro: dados.link_roteiro } : ens));
      } else {
        alert(dados.error || 'Erro ao fazer upload do arquivo.');
      }
    } catch (err) {
      console.error('Erro no upload:', err);
      alert('Erro de comunicação com o servidor ao subir o PDF.');
    } finally {
      setSalvandoId(null);
    }
  };

  // 🟢 FILTRAGEM DINÂMICA: Filtra o array original antes de renderizar na tela
  const ensaiosFiltrados = ensaios.filter(ensaio => {
    if (filtroStatus === 'Todos') return true;
    return ensaio.status === filtroStatus;
  });

  if (!usuario) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 antialiased font-sans">
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl max-w-md w-full p-8 shadow-2xl transition-all">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Arsenal Connect 🛠️
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1.5 uppercase tracking-wider">
              Painel Operacional da Equipe
            </p>
          </div>
          
          <form onSubmit={lidarComLogin} className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                E-mail de Acesso
              </label>
              <input 
                type="email" 
                required
                placeholder="seu.email@empresa.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 text-sm text-slate-100 px-4 py-3 rounded-xl placeholder-slate-700 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                Senha de Acesso
              </label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={senhaInput}
                onChange={(e) => setSenhaInput(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 text-sm text-slate-100 px-4 py-3 rounded-xl placeholder-slate-700 outline-none transition-all"
              />
            </div>

            {erroLogin && (
              <div className="text-xs text-rose-400 bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl text-center font-medium">
                {erroLogin}
              </div>
            )}

            <button 
              type="submit" 
              disabled={carregandoLogin}
              className="w-full bg-white hover:bg-slate-100 text-slate-950 font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {carregandoLogin ? 'Verificando as credenciais...' : 'Entrar no Painel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 antialiased font-sans">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-100">
            {isGerente ? 'Arsenal Connect — Gerente 🎬' : 'Painel Operacional do Colaborador 🛠️'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Bem-vindo de volta, <span className="text-slate-200 font-semibold">{usuario.nome}</span>
          </p>
        </div>
        <button 
          onClick={onLogout} 
          className="self-start sm:self-center bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
        >
          Sair do Painel
        </button>
      </div>

      {/* 🟢 ABAS DO GERENTE — SÓ APARECEM PRO GERENTE */}
      {isGerente && (
        <div className="flex gap-2 mb-6">
          {(['ensaios', 'dashboard'] as const).map((aba) => (
            <button
              key={aba}
              onClick={() => setAbaPrincipal(aba)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-[0.98] ${
                abaPrincipal === aba
                  ? 'bg-white text-slate-950 border-white shadow-lg'
                  : 'bg-slate-900/40 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {aba === 'ensaios' ? '📅 Agendamentos' : '📊 Dashboard da Equipe'}
            </button>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* ABA: DASHBOARD DA EQUIPE (só gerente)              */}
      {/* ═══════════════════════════════════════════════════ */}
      {isGerente && abaPrincipal === 'dashboard' && (
        <>
          {/* NAVEGADOR DE MÊS */}
          {(() => {
            const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

            const irParaMesAnterior = () => {
              setMembroExpandido(null);
              setMesAtivo(prev => {
                if (prev.mes === 1) return { mes: 12, ano: prev.ano - 1 };
                return { mes: prev.mes - 1, ano: prev.ano };
              });
            };

            const irParaProximoMes = () => {
              setMembroExpandido(null);
              setMesAtivo(prev => {
                if (prev.mes === 12) return { mes: 1, ano: prev.ano + 1 };
                return { mes: prev.mes + 1, ano: prev.ano };
              });
            };

            const esteEhOMesAtual =
              mesAtivo.mes === hoje.getMonth() + 1 &&
              mesAtivo.ano === hoje.getFullYear();

            // Filtra os trabalhos de cada membro para o mês/ano ativo
            // data_ensaio vem no formato "DD/MM/YYYY" do backend
            const dashboardFiltrado = dashboardEquipe
              .map((membro) => {
                const trabalhosFiltrados = membro.trabalhos.filter((t) => {
                  const partes = t.data_ensaio.split('/');
                  if (partes.length !== 3) return false;
                  const mesTrab = parseInt(partes[1], 10);
                  const anoTrab = parseInt(partes[2], 10);
                  return mesTrab === mesAtivo.mes && anoTrab === mesAtivo.ano;
                });

                const totais = trabalhosFiltrados.reduce(
                  (acc, t) => {
                    acc.total++;
                    if (t.status === 'Concluído') acc.concluidos++;
                    if (t.status === 'Agendado') acc.agendados++;
                    if (t.papel === 'Filmmaker') acc.filmmaker++;
                    if (t.papel === 'Roteirista') acc.roteirista++;
                    if (t.papel === 'Auxiliar Técnico') acc.auxiliar++;
                    return acc;
                  },
                  { total: 0, concluidos: 0, agendados: 0, filmmaker: 0, roteirista: 0, auxiliar: 0 }
                );

                return { ...membro, trabalhos: trabalhosFiltrados, totais };
              })
              .filter((m) => m.totais.total > 0);

            return (
              <>
                {/* Barra de navegação de mês */}
                <div className="flex items-center justify-between mb-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl px-5 py-3.5">
                  <button
                    onClick={irParaMesAnterior}
                    className="text-slate-400 hover:text-slate-100 transition-colors p-1.5 rounded-lg hover:bg-slate-800/60 active:scale-95"
                  >
                    ← Anterior
                  </button>

                  <div className="text-center">
                    <p className="text-base font-black text-slate-100 tracking-tight">
                      {MESES_PT[mesAtivo.mes - 1]} {mesAtivo.ano}
                    </p>
                    {esteEhOMesAtual && (
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                        • mês atual
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* BOTÃO DE EXPORTAR RELATÓRIO */}
                    {dashboardFiltrado.length > 0 && (
                      <button
                        onClick={() => {
                          const nomeMes = MESES_PT[mesAtivo.mes - 1];
                          const totalGeral = dashboardFiltrado.reduce((s, m) => s + m.totais.total, 0);
                          const totalConcluidos = dashboardFiltrado.reduce((s, m) => s + m.totais.concluidos, 0);

                          const corPapel: Record<string, string> = {
                            'Filmmaker':        '#10b981',
                            'Roteirista':       '#38bdf8',
                            'Auxiliar Técnico': '#f59e0b',
                          };
                          const bgPapel: Record<string, string> = {
                            'Filmmaker':        '#052e16',
                            'Roteirista':       '#082f49',
                            'Auxiliar Técnico': '#1c1100',
                          };
                          const corStatus: Record<string, string> = {
                            'Concluído': '#a78bfa',
                            'Agendado':  '#60a5fa',
                            'Cancelado': '#f87171',
                          };

                          const cardsHtml = dashboardFiltrado.map(membro => {
                            const trabalhoLinhas = membro.trabalhos.map((t, i) => `
                              <tr style="background:${i % 2 === 0 ? '#0f172a' : '#0d1526'}">
                                <td style="padding:10px 14px;color:#94a3b8;font-size:12px;font-weight:700;">#${t.id}</td>
                                <td style="padding:10px 14px;color:#e2e8f0;font-size:13px;font-weight:600;">${t.empresa_nome}</td>
                                <td style="padding:10px 14px;color:#94a3b8;font-size:12px;">${t.data_ensaio} · ${t.hora_inicio.substring(0,5)}</td>
                                <td style="padding:10px 14px;">
                                  <span style="background:${bgPapel[t.papel] ?? '#1e293b'};color:${corPapel[t.papel] ?? '#94a3b8'};border:1px solid ${corPapel[t.papel] ?? '#334155'}40;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">
                                    ${t.papel}
                                  </span>
                                </td>
                                <td style="padding:10px 14px;">
                                  <span style="color:${corStatus[t.status] ?? '#94a3b8'};font-size:12px;font-weight:700;">${t.status}</span>
                                </td>
                              </tr>
                            `).join('');

                            const chips = [
                              membro.totais.filmmaker  > 0 ? `<span style="background:#052e16;color:#10b981;border:1px solid #10b98140;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">🎥 ${membro.totais.filmmaker}× Filmmaker</span>` : '',
                              membro.totais.roteirista > 0 ? `<span style="background:#082f49;color:#38bdf8;border:1px solid #38bdf840;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">📝 ${membro.totais.roteirista}× Roteirista</span>` : '',
                              membro.totais.auxiliar   > 0 ? `<span style="background:#1c1100;color:#f59e0b;border:1px solid #f59e0b40;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;">⚡ ${membro.totais.auxiliar}× Auxiliar</span>` : '',
                            ].filter(Boolean).join('');

                            return `
                              <div style="background:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden;margin-bottom:20px;page-break-inside:avoid;">
                                <div style="padding:18px 22px;border-bottom:1px solid #1e293b;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                                  <div style="display:flex;align-items:center;gap:14px;">
                                    <div style="width:40px;height:40px;border-radius:50%;background:#1e293b;border:1px solid #334155;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#e2e8f0;flex-shrink:0;">
                                      ${membro.nome.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p style="margin:0;font-size:15px;font-weight:800;color:#f1f5f9;">${membro.nome}</p>
                                      <p style="margin:4px 0 0;font-size:11px;color:#64748b;">${membro.email}</p>
                                    </div>
                                  </div>
                                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                    <span style="background:#1e293b;color:#cbd5e1;border:1px solid #334155;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:700;">${membro.totais.total} trabalho${membro.totais.total !== 1 ? 's' : ''}</span>
                                    ${chips}
                                  </div>
                                </div>
                                <table style="width:100%;border-collapse:collapse;">
                                  <thead>
                                    <tr style="background:#0a0f1a;">
                                      <th style="padding:8px 14px;text-align:left;font-size:10px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">ID</th>
                                      <th style="padding:8px 14px;text-align:left;font-size:10px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Empresa</th>
                                      <th style="padding:8px 14px;text-align:left;font-size:10px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Data</th>
                                      <th style="padding:8px 14px;text-align:left;font-size:10px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Papel</th>
                                      <th style="padding:8px 14px;text-align:left;font-size:10px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>${trabalhoLinhas}</tbody>
                                </table>
                              </div>
                            `;
                          }).join('');

                          const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Arsenal — ${nomeMes} ${mesAtivo.ano}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:#020817;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px 32px;color:#e2e8f0;}
    @media print{
      .no-print{display:none!important;}
      body{background:#020817!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    }
  </style>
</head>
<body>
  <!-- BOTÃO IMPRIMIR -->
  <div class="no-print" style="position:fixed;top:20px;right:24px;z-index:99;display:flex;gap:10px;">
    <button onclick="window.print()" style="background:#fff;color:#0f172a;border:none;padding:10px 20px;border-radius:10px;font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 4px 20px #0008;">
      🖨️ Imprimir / Salvar PDF
    </button>
    <button onclick="window.close()" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;padding:10px 16px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;">
      ✕ Fechar
    </button>
  </div>

  <!-- CABEÇALHO -->
  <div style="margin-bottom:32px;">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
      <div style="width:48px;height:48px;background:#1e293b;border:1px solid #334155;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">🎬</div>
      <div>
        <h1 style="font-size:24px;font-weight:900;color:#f8fafc;letter-spacing:-0.5px;">Arsenal Estratégia</h1>
        <p style="font-size:13px;color:#64748b;margin-top:2px;">Relatório de Equipe — ${nomeMes} ${mesAtivo.ano}</p>
      </div>
    </div>

    <!-- CARDS DE RESUMO GERAL -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:8px;">
      <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:16px 20px;">
        <p style="font-size:10px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Total de trabalhos</p>
        <p style="font-size:28px;font-weight:900;color:#f1f5f9;">${totalGeral}</p>
      </div>
      <div style="background:#0f172a;border:1px solid #a78bfa30;border-radius:12px;padding:16px 20px;">
        <p style="font-size:10px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Concluídos</p>
        <p style="font-size:28px;font-weight:900;color:#a78bfa;">${totalConcluidos}</p>
      </div>
      <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:16px 20px;">
        <p style="font-size:10px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Integrantes ativos</p>
        <p style="font-size:28px;font-weight:900;color:#f1f5f9;">${dashboardFiltrado.length}</p>
      </div>
    </div>
  </div>

  <!-- CARDS POR MEMBRO -->
  ${cardsHtml}

  <p style="text-align:center;font-size:11px;color:#1e293b;margin-top:32px;">Gerado em ${new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
</body>
</html>`;

                          const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          window.open(url, '_blank');
                          setTimeout(() => URL.revokeObjectURL(url), 60000);
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 hover:bg-slate-800/60 px-3 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        ↓ Exportar Relatório
                      </button>
                    )}

                    <button
                      onClick={irParaProximoMes}
                      disabled={esteEhOMesAtual}
                      className="text-slate-400 hover:text-slate-100 transition-colors p-1.5 rounded-lg hover:bg-slate-800/60 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      Próximo →
                    </button>
                  </div>
                </div>

                {/* Conteúdo filtrado */}
                {carregandoDashboard ? (
                  <div className="flex items-center justify-center py-24">
                    <div className="text-center space-y-3">
                      <div className="w-7 h-7 border-2 border-slate-800 border-t-slate-400 rounded-full animate-spin mx-auto" />
                      <p className="text-sm text-slate-500">Carregando dados da equipe...</p>
                    </div>
                  </div>
                ) : dashboardFiltrado.length === 0 ? (
                  <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
                    <p className="text-sm text-slate-500 font-medium">
                      Nenhum trabalho em {MESES_PT[mesAtivo.mes - 1].toLowerCase()} de {mesAtivo.ano}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dashboardFiltrado.map((membro) => {
                      const expandido = membroExpandido === membro.id;
                      return (
                        <div key={membro.id} className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
                          
                          {/* Linha do membro — clicável para expandir/colapsar */}
                          <button
                            onClick={() => setMembroExpandido(expandido ? null : membro.id)}
                            className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 text-left hover:bg-slate-800/20 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-black text-slate-200 shrink-0">
                                {membro.nome.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-100 leading-tight">{membro.nome}</p>
                                <p className="text-[11px] text-slate-500">{membro.email}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                              <span className="bg-slate-950/60 border border-slate-800 text-slate-300 text-[11px] font-bold px-3 py-1 rounded-lg">
                                {membro.totais.total} trabalho{membro.totais.total !== 1 ? 's' : ''}
                              </span>
                              {membro.totais.concluidos > 0 && (
                                <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-bold px-3 py-1 rounded-lg">
                                  ✅ {membro.totais.concluidos} concluído{membro.totais.concluidos !== 1 ? 's' : ''}
                                </span>
                              )}
                              {membro.totais.agendados > 0 && (
                                <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold px-3 py-1 rounded-lg">
                                  ⏳ {membro.totais.agendados} agendado{membro.totais.agendados !== 1 ? 's' : ''}
                                </span>
                              )}
                              {membro.totais.filmmaker > 0 && (
                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold px-3 py-1 rounded-lg">
                                  🎥 {membro.totais.filmmaker}× Filmmaker
                                </span>
                              )}
                              {membro.totais.roteirista > 0 && (
                                <span className="bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[11px] font-bold px-3 py-1 rounded-lg">
                                  📝 {membro.totais.roteirista}× Roteirista
                                </span>
                              )}
                              {membro.totais.auxiliar > 0 && (
                                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold px-3 py-1 rounded-lg">
                                  ⚡ {membro.totais.auxiliar}× Auxiliar
                                </span>
                              )}
                              <span className={`text-slate-500 text-[10px] transition-transform duration-200 ml-1 ${expandido ? 'rotate-180' : ''}`}>▼</span>
                            </div>
                          </button>

                          {/* Lista de trabalhos (expansível) */}
                          {expandido && (
                            <div className="border-t border-slate-800/60 divide-y divide-slate-800/30">
                              {membro.trabalhos.map((trabalho) => {
                                const papelConfig = {
                                  'Filmmaker':        { cor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', emoji: '🎥' },
                                  'Roteirista':       { cor: 'text-sky-400 bg-sky-500/10 border-sky-500/20', emoji: '📝' },
                                  'Auxiliar Técnico': { cor: 'text-amber-400 bg-amber-500/10 border-amber-500/20', emoji: '⚡' },
                                }[trabalho.papel] ?? { cor: 'text-slate-400 bg-slate-800 border-slate-700', emoji: '•' };

                                const statusCor = {
                                  'Concluído': 'text-purple-400',
                                  'Cancelado': 'text-rose-400',
                                  'Agendado':  'text-blue-400',
                                }[trabalho.status] ?? 'text-slate-400';

                                return (
                                  <div key={`${membro.id}-${trabalho.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 hover:bg-slate-800/10 transition-all">
                                    <div className="flex items-center gap-3">
                                      <span className="text-[10px] text-slate-700 font-bold w-7 shrink-0">#{trabalho.id}</span>
                                      <div>
                                        <p className="text-sm font-semibold text-slate-200">{trabalho.empresa_nome}</p>
                                        <p className="text-[11px] text-slate-500">{trabalho.data_ensaio} · {trabalho.hora_inicio.substring(0, 5)}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 pl-10 sm:pl-0">
                                      <span className={`text-[11px] font-bold border px-2.5 py-0.5 rounded-lg ${papelConfig.cor}`}>
                                        {papelConfig.emoji} {trabalho.papel}
                                      </span>
                                      <span className={`text-[11px] font-bold ${statusCor}`}>
                                        {trabalho.status}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* ABA: ENSAIOS (padrão — todos os usuários)          */}
      {/* ═══════════════════════════════════════════════════ */}
      {(!isGerente || abaPrincipal === 'ensaios') && (
      <>

      {ensaios.length === 0 ? (
        <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-sm text-slate-500 font-medium">Você não possui nenhum ensaio escalado no momento.</p>
        </div>
      ) : (
        <>
          {/* 🟢 BARRA DE FILTROS DINÂMICOS */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['Todos', 'Agendado', 'Concluído', 'Cancelado'].map((status) => (
              <button
                key={status}
                onClick={() => setFiltroStatus(status)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all active:scale-[0.98] ${
                  filtroStatus === status
                    ? 'bg-white text-slate-950 border-white shadow-lg'
                    : 'bg-slate-900/40 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Se o filtro selecionado não retornar nenhum item */}
          {ensaiosFiltrados.length === 0 ? (
            <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <p className="text-sm text-slate-500 font-medium">
                Nenhum ensaio com o status "{filtroStatus}" encontrado.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ensaiosFiltrados.map(ensaio => {
                const ehRoteirista = ensaio.roteirista_responsavel === usuario.nome;
                const ehFilmmaker = ensaio.fotografo_responsavel === usuario.nome;
                const ehAuxiliar = ensaio.auxiliar_responsavel === usuario.nome;
                
                const estaFinalizado = ensaio.status === 'Concluído';
                const estaCancelado = ensaio.status === 'Cancelado';

                return (
                  <div 
                    key={ensaio.id} 
                    className={`bg-slate-900/40 backdrop-blur-sm border rounded-2xl p-5 shadow-xl flex flex-col justify-between gap-5 transition-all ${
                      estaFinalizado 
                        ? 'border-purple-500/20 opacity-80 shadow-purple-950/10' 
                        : estaCancelado
                        ? 'border-rose-500/20 opacity-60 bg-rose-950/5'
                        : 'border-slate-900 hover:border-slate-800/80'
                    }`}
                  >
                    {/* Topo do Card */}
                    <div className="flex flex-col gap-2.5 border-b border-slate-900 pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-bold text-slate-200 tracking-tight leading-snug">
                          {ensaio.empresa_nome}
                        </h3>
                        <span className="shrink-0 bg-slate-950 text-slate-400 border border-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                          ID: {ensaio.id}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {estaFinalizado && (
                          <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                            ✅ Concluído
                          </span>
                        )}
                        {estaCancelado && (
                          <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                            ❌ Cancelado
                          </span>
                        )}
                        {!estaFinalizado && !estaCancelado && (
                          <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                            ⏳ Agendado
                          </span>
                        )}
                        
                        {ehRoteirista && (
                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[11px] font-bold">
                            📝 Roteirista
                          </span>
                        )}
                        {ehFilmmaker && (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[11px] font-bold">
                            🎥 Filmmaker
                          </span>
                        )}
                        {ehAuxiliar && (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[11px] font-bold">
                            ⚡ Auxiliar Técnico
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Datas e Horas */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-950/40 border border-slate-900/60 rounded-xl p-2.5">
                        <span className="block text-[9px] uppercase text-slate-500 font-bold tracking-wider mb-0.5">📅 Data</span>
                        <span className="text-slate-300 font-medium">{ensaio.data_ensaio}</span>
                      </div>
                      <div className="bg-slate-950/40 border border-slate-900/60 rounded-xl p-2.5">
                        <span className="block text-[9px] uppercase text-slate-500 font-bold tracking-wider mb-0.5">⏰ Horário</span>
                        <span className="text-slate-300 font-medium">{ensaio.hora_inicio.substring(0, 5)}</span>
                      </div>
                    </div>

                    {/* Links Atuais */}
                    <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3.5 space-y-2.5">
                      <span className="block text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                        Materiais do Ensaio
                      </span>
                      
                      <div className="flex flex-col gap-2 text-xs">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-900 last:border-0 last:pb-0">
                          <span className="text-slate-400">Roteiro:</span>
                          {ensaio.link_roteiro ? (
                            <a href={ensaio.link_roteiro} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-semibold bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10">
                              Acessar PDF 🔗
                            </a>
                          ) : (
                            <span className="text-slate-600 italic">Pendente</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-900 last:border-0 last:pb-0">
                          <span className="text-slate-400">Brutos/Drive:</span>
                          {ensaio.link_arquivos_ensaio ? (
                            <a href={ensaio.link_arquivos_ensaio} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline font-semibold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                              Ver Mídias 🔗
                            </a>
                          ) : (
                            <span className="text-slate-600 italic">Pendente</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Mat. Auxiliares:</span>
                          {ensaio.link_materiais_auxiliares ? (
                            <a href={ensaio.link_materiais_auxiliares} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline font-semibold bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                              Ver Anexos 🔗
                            </a>
                          ) : (
                            <span className="text-slate-600 italic">Pendente</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ações/Inputs */}
                    <div className="mt-2 pt-4 border-t border-slate-900 space-y-3.5">
                      {ehRoteirista && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                            {estaFinalizado || estaCancelado ? '🔒 Ensaio Bloqueado' : ensaio.link_roteiro ? '🔄 Substituir arquivo do Roteiro' : '📤 Subir Roteiro Oficial'}
                          </label>
                          <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                            <input 
                              type="file" 
                              accept=".pdf"
                              disabled={salvandoId === ensaio.id || estaFinalizado || estaCancelado}
                              onChange={(e) => lidarComUploadRoteiro(ensaio.id, e)}
                              className={`block w-full text-xs text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 transition-all outline-none ${
                                estaFinalizado || estaCancelado ? 'cursor-not-allowed opacity-40' : 'file:cursor-pointer cursor-pointer'
                              }`}
                            />
                            {salvandoId === ensaio.id && (
                              <span className="text-[11px] text-blue-400 font-bold animate-pulse shrink-0">Subindo...</span>
                            )}
                          </div>
                        </div>
                      )}

                      {ehFilmmaker && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                            {estaFinalizado || estaCancelado ? '🔒 Entrega Bloqueada' : 'Entrega de Arquivos Brutos (Filmmaker)'}
                          </label>
                          <div className="flex gap-2">
                            <input 
                              type="url" 
                              placeholder="Link do Drive ou Frame.io" 
                              value={linksEditados[`${ensaio.id}-link_arquivos_ensaio`] || ''} 
                              onChange={(e) => lidarComMudancaInput(ensaio.id, 'link_arquivos_ensaio', e.target.value)}
                              disabled={estaFinalizado || estaCancelado}
                              className="flex-1 bg-slate-950 border border-slate-800 focus:border-slate-700 text-xs text-slate-200 px-3 py-2 rounded-xl placeholder-slate-800 outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                            <button 
                              onClick={() => salvarLinkNoBanco(ensaio.id, 'link_arquivos_ensaio')} 
                              disabled={salvandoId === ensaio.id || estaFinalizado || estaCancelado}
                              className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 text-xs font-bold px-3 py-2 rounded-xl transition-all shrink-0 disabled:opacity-20 disabled:pointer-events-none"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      )}

                      {ehAuxiliar && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                            {estaFinalizado || estaCancelado ? '🔒 Materiais Bloqueados' : 'Entrega de Materiais Auxiliares (Auxiliar)'}
                          </label>
                          <div className="flex gap-2">
                            <input 
                              type="url" 
                              placeholder="Link do Material de Apoio" 
                              value={linksEditados[`${ensaio.id}-link_materiais_auxiliares`] || ''} 
                              onChange={(e) => lidarComMudancaInput(ensaio.id, 'link_materiais_auxiliares', e.target.value)}
                              disabled={estaFinalizado || estaCancelado}
                              className="flex-1 bg-slate-950 border border-slate-800 focus:border-slate-700 text-xs text-slate-200 px-3 py-2 rounded-xl placeholder-slate-800 outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                            <button 
                              onClick={() => salvarLinkNoBanco(ensaio.id, 'link_materiais_auxiliares')} 
                              disabled={salvandoId === ensaio.id || estaFinalizado || estaCancelado}
                              className="bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/20 text-xs font-bold px-3 py-2 rounded-xl transition-all shrink-0 disabled:opacity-20 disabled:pointer-events-none"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      {/* fim da aba ensaios */}
      </>
      )}
    </div>
  );
}
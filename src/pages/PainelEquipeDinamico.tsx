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

export default function PainelEquipeDinamico() {
  const [usuario, setUsuario] = useState<{ id: number; nome: string; email: string } | null>(() => {
    const salvo = localStorage.getItem('arsenal_usuario');
    return salvo ? JSON.parse(salvo) : null;
  });
  
  const [emailInput, setEmailInput] = useState('');
  const [senhaInput, setSenhaInput] = useState(''); // 🟢 ALTERAÇÃO 1: Criado o estado para armazenar a senha
  const [erroLogin, setErroLogin] = useState('');
  const [carregandoLogin, setCarregandoLogin] = useState(false);

  const [ensaios, setEnsaios] = useState<Ensaio[]>([]);
  const [linksEditados, setLinksEditados] = useState<{ [key: string]: string }>({});
  const [salvandoId, setSalvandoId] = useState<number | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || '';
  const BASE_URL = API_URL.endsWith('/api') ? API_URL : (API_URL ? `${API_URL}/api` : '/api');

  useEffect(() => {
    if (!usuario) return;

    const carregarMeusEnsaios = async () => {
      try {
        const res = await fetch(`${BASE_URL}/painel/meus-ensaios?nomeColaborador=${encodeURIComponent(usuario.nome)}`);
        const dados = await res.json();
        if (res.ok) {
          setEnsaios(dados);
          
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
    carregarMeusEnsaios();
  }, [usuario, BASE_URL]);

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
          senha: senhaInput // 🟢 ALTERAÇÃO 2: Agora envia e-mail E senha para o backend
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
    setEmailInput('');
    setSenhaInput(''); // Limpa o campo de senha no logout por segurança
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
        alert('Link updated successfully!');
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
            {/* Input de E-mail */}
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

            {/* 🟢 ALTERAÇÃO 3: Campo visual de Senha inserido seguindo exatamente o design original */}
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
      
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-100">
            Painel Operacional do Colaborador 🛠️
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

      {ensaios.length === 0 ? (
        <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-sm text-slate-500 font-medium">Você não possui nenhum ensaio escalado no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ensaios.map(ensaio => {
            const ehRoteirista = ensaio.roteirista_responsavel === usuario.nome;
            const ehFilmmaker = ensaio.fotografo_responsavel === usuario.nome;
            const ehAuxiliar = ensaio.auxiliar_responsavel === usuario.nome;
            
            const estaFinalizado = ensaio.status === 'Concluído';

            return (
              <div 
                key={ensaio.id} 
                className={`bg-slate-900/40 backdrop-blur-sm border rounded-2xl p-5 shadow-xl flex flex-col justify-between gap-5 transition-all ${
                  estaFinalizado 
                    ? 'border-purple-500/20 opacity-80 shadow-purple-950/10' 
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
                        ✅ Finalizado
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
                        {estaFinalizado ? '🔒 Ensaio Concluído (Bloqueado)' : ensaio.link_roteiro ? '🔄 Substituir arquivo do Roteiro' : '📤 Subir Roteiro Oficial'}
                      </label>
                      <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <input 
                          type="file" 
                          accept=".pdf"
                          disabled={salvandoId === ensaio.id || estaFinalizado}
                          onChange={(e) => lidarComUploadRoteiro(ensaio.id, e)}
                          className={`block w-full text-xs text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 transition-all outline-none ${
                            estaFinalizado ? 'cursor-not-allowed opacity-40' : 'file:cursor-pointer cursor-pointer'
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
                        {estaFinalizado ? '🔒 Entrega Bloqueada (Concluído)' : 'Entrega de Arquivos Brutos (Filmmaker)'}
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="url" 
                          placeholder="Link do Drive ou Frame.io" 
                          value={linksEditados[`${ensaio.id}-link_arquivos_ensaio`] || ''} 
                          onChange={(e) => lidarComMudancaInput(ensaio.id, 'link_arquivos_ensaio', e.target.value)}
                          disabled={estaFinalizado}
                          className="flex-1 bg-slate-950 border border-slate-800 focus:border-slate-700 text-xs text-slate-200 px-3 py-2 rounded-xl placeholder-slate-800 outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                        <button 
                          onClick={() => salvarLinkNoBanco(ensaio.id, 'link_arquivos_ensaio')} 
                          disabled={salvandoId === ensaio.id || estaFinalizado}
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
                        {estaFinalizado ? '🔒 Materiais Bloqueados (Concluído)' : 'Entrega de Materiais Auxiliares (Auxiliar)'}
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="url" 
                          placeholder="Link do Material de Apoio" 
                          value={linksEditados[`${ensaio.id}-link_materiais_auxiliares`] || ''} 
                          onChange={(e) => lidarComMudancaInput(ensaio.id, 'link_materiais_auxiliares', e.target.value)}
                          disabled={estaFinalizado}
                          className="flex-1 bg-slate-950 border border-slate-800 focus:border-slate-700 text-xs text-slate-200 px-3 py-2 rounded-xl placeholder-slate-800 outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                        <button 
                          onClick={() => salvarLinkNoBanco(ensaio.id, 'link_materiais_auxiliares')} 
                          disabled={salvandoId === ensaio.id || estaFinalizado}
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
    </div>
  );
}
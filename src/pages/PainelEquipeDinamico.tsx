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
  // 🔐 O próprio painel agora gerencia e lembra quem está logado
  const [usuario, setUsuario] = useState<{ id: number; nome: string; email: string } | null>(() => {
    const salvo = localStorage.getItem('arsenal_usuario');
    return salvo ? JSON.parse(salvo) : null;
  });
  
  const [emailInput, setEmailInput] = useState('');
  const [erroLogin, setErroLogin] = useState('');
  const [carregandoLogin, setCarregandoLogin] = useState(false);

  const [ensaios, setEnsaios] = useState<Ensaio[]>([]);
  const [linksEditados, setLinksEditados] = useState<{ [key: string]: string }>({});
  const [salvandoId, setSalvandoId] = useState<number | null>(null);

  // 🌐 URL Base vinda do ambiente ou fallback
  const API_URL = import.meta.env.VITE_API_URL || 'https://trabalho-agendamento-ensaios.onrender.com';

  // 🔥 CORREÇÃO: Remove a duplicidade caso a variável do Render já termine com '/api'
  const BASE_URL = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

  useEffect(() => {
    // Só busca os ensaios se houver um usuário logado
    if (!usuario) return;

    const carregarMeusEnsaios = async () => {
      try {
        // 🚀 Alterado para usar BASE_URL sem duplicar /api
        const res = await fetch(`${BASE_URL}/painel/meus-ensaios?nomeColaborador=${encodeURIComponent(usuario.nome)}`);
        const dados = await res.json();
        if (res.ok) {
          setEnsaios(dados);
          // Inicializa o estado dos inputs com os links já salvos no banco
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
      // 🚀 Alterado para usar BASE_URL sem duplicar /api
      const res = await fetch(`${BASE_URL}/painel/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput }),
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
  };

  const lidarComMudancaInput = (ensaioId: number, campo: string, valor: string) => {
    setLinksEditados(prev => ({ ...prev, [`${ensaioId}-${campo}`]: valor }));
  };

  const salvarLinkNoBanco = async (ensaioId: number, campo: string) => {
    setSalvandoId(ensaioId);
    const valorDoLink = linksEditados[`${ensaioId}-${campo}`];

    try {
      // 🚀 Alterado para usar BASE_URL sem duplicar /api
      const res = await fetch(`${BASE_URL}/painel/ensaios/${ensaioId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [campo]: valorDoLink })
      });

      if (res.ok) {
        alert('Link updated com sucesso!');
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
      // 🚀 Alterado para usar BASE_URL sem duplicar /api
      const res = await fetch(`${BASE_URL}/painel/ensaios/${ensaioId}/roteiro`, {
        method: 'PATCH',
        body: formData, 
      });

      const dados = await res.json();

      if (res.ok) {
        alert('Roteiro em PDF enviado e updated com sucesso!');
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

  // 🚪 SE NÃO ESTIVER LOGADO
  if (!usuario) {
    return (
      <div style={{ fontFamily: 'sans-serif', backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px' }}>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', maxWidth: '400px', width: '100%', padding: '30px', border: '1px solid #334155' }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '22px', textAlign: 'center' }}>Arsenal Connect 🛠️</h2>
          <p style={{ margin: '0 0 20px 0', color: '#94a3b8', fontSize: '14px', textAlign: 'center' }}>Painel Operacional da Equipe</p>
          
          <form onSubmit={lidarComLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 'bold' }}>E-MAIL DE ACESSO</label>
              <input 
                type="email" 
                required
                placeholder="seu.email@empresa.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '14px' }}
              />
            </div>

            {erroLogin && (
              <p style={{ color: '#f87171', fontSize: '13px', margin: 0, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '4px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {erroLogin}
              </p>
            )}

            <button 
              type="submit" 
              disabled={carregandoLogin}
              style={{ backgroundColor: '#fff', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', opacity: carregandoLogin ? 0.7 : 1 } as any}
            >
              {carregandoLogin ? 'Verificando...' : 'Entrar no Painel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 💻 SE ESTIVER LOGADO
  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh', padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #1e293b', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>Painel Operacional do Colaborador 🛠️</h1>
          <p style={{ margin: '5px 0 0 0', color: '#94a3b8' }}>Bem-vindo de volta, <strong>{usuario.nome}</strong></p>
        </div>
        <button onClick={onLogout} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Sair</button>
      </div>

      {ensaios.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>Você não possui nenhum ensaio escalado no momento.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ backgroundColor: '#334155', color: '#cbd5e1' }}>
                <th style={{ padding: '12px 15px' }}>Empresa</th>
                <th style={{ padding: '12px 15px' }}>Data / Hora</th>
                <th style={{ padding: '12px 15px' }}>Sua Função Ocupada</th>
                <th style={{ padding: '12px 15px' }}>Entrega do Documento / Link</th>
              </tr>
            </thead>
            <tbody>
              {ensaios.map(ensaio => {
                const ehRoteirista = ensaio.roteirista_responsavel === usuario.nome;
                const ehFilmmaker = ensaio.fotografo_responsavel === usuario.nome;
                const ehAuxiliar = ensaio.auxiliar_responsavel === usuario.nome;

                return (
                  <tr key={ensaio.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '15px' }}><strong>{ensaio.empresa_nome}</strong></td>
                    <td style={{ padding: '15px' }}>{ensaio.data_ensaio} às {ensaio.hora_inicio.substring(0, 5)}</td>
                    <td style={{ padding: '15px' }}>
                      {ehRoteirista && <span style={{ backgroundColor: '#3b82f6', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>📝 Roteirista</span>}
                      {ehFilmmaker && <span style={{ backgroundColor: '#10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginLeft: '5px' }}>🎥 Filmmaker</span>}
                      {ehAuxiliar && <span style={{ backgroundColor: '#f59e0b', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginLeft: '5px' }}>⚡ Auxiliar Técnico</span>}
                    </td>
                    <td style={{ padding: '15px' }}>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                        {ensaio.link_roteiro && (
                          <a 
                            href={ensaio.link_roteiro} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#1e3a8a', color: '#60a5fa', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none', border: '1px solid #2563eb' }}
                          >
                            📄 Ver Roteiro (PDF R2)
                          </a>
                        )}
                        {ensaio.link_arquivos_ensaio && (
                          <a 
                            href={ensaio.link_arquivos_ensaio} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#064e3b', color: '#34d399', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none', border: '1px solid #059669' }}
                          >
                            🎬 Arquivos do Ensaio
                          </a>
                        )}
                        {ensaio.link_materiais_auxiliares && (
                          <a 
                            href={ensaio.link_materiais_auxiliares} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#78350f', color: '#fbbf24', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none', border: '1px solid #d97706' }}
                          >
                            ⚡ Mat. Auxiliares
                          </a>
                        )}
                      </div>

                      {ehRoteirista && (
                        <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155', marginBottom: '10px' }}>
                          <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '6px' }}>
                            {ensaio.link_roteiro ? '🔄 SUBSTITUIR ARQUIVO PDF DO ROTEIRO' : '📤 SUBIR ARQUIVO PDF DO ROTEIRO'}
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input 
                              type="file" 
                              accept=".pdf"
                              disabled={salvandoId === ensaio.id}
                              onChange={(e) => lidarComUploadRoteiro(ensaio.id, e)}
                              style={{ color: '#cbd5e1', fontSize: '13px', cursor: 'pointer' }}
                            />
                            {salvandoId === ensaio.id && (
                              <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 'bold' }}>Subindo...</span>
                            )}
                          </div>
                        </div>
                      )}

                      {ehFilmmaker && (
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                          <input 
                            type="url" 
                            placeholder="Colar link dos Brutos/Editados (Drive/Frame.io)" 
                            value={linksEditados[`${ensaio.id}-link_arquivos_ensaio`] || ''} 
                            onChange={(e) => lidarComMudancaInput(ensaio.id, 'link_arquivos_ensaio', e.target.value)}
                            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
                          />
                          <button onClick={() => salvarLinkNoBanco(ensaio.id, 'link_arquivos_ensaio')} disabled={salvandoId === ensaio.id} style={{ backgroundColor: '#22c55e', border: 'none', borderRadius: '4px', padding: '8px 12px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Salvar</button>
                        </div>
                      )}

                      {ehAuxiliar && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input 
                            type="url" 
                            placeholder="Colar link de Materiais Auxiliares" 
                            value={linksEditados[`${ensaio.id}-link_materiais_auxiliares`] || ''} 
                            onChange={(e) => lidarComMudancaInput(ensaio.id, 'link_materiais_auxiliares', e.target.value)}
                            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
                          />
                          <button onClick={() => salvarLinkNoBanco(ensaio.id, 'link_materiais_auxiliares')} disabled={salvandoId === ensaio.id} style={{ backgroundColor: '#22c55e', border: 'none', borderRadius: '4px', padding: '8px 12px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Salvar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
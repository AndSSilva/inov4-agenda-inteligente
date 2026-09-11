import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  criarReservaPublica,
  getEmpresaPublica,
  getHorariosDisponiveis,
  type ServicoPublico,
} from "@/lib/publico.functions";
import { NOMES_DIAS, dataLocal, moeda, somaDias } from "@/lib/tempo";

export const Route = createFileRoute("/$slug")({
  loader: async ({ params }) => {
    const empresa = await getEmpresaPublica({ data: { slug: params.slug } });
    if (!empresa) throw notFound();
    return { empresa };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Agenda indisponível — Cronica" },
          { name: "description", content: "Esta agenda pública não está disponível." },
          { name: "robots", content: "noindex" },
          { property: "og:title", content: "Agenda indisponível — Cronica" },
          { property: "og:description", content: "Esta agenda pública não está disponível." },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary" },
        ],
      };
    }
    const titulo = `Agendar em ${loaderData.empresa.nome}`;
    const desc = `Escolha o serviço, o horário e reserve online em ${loaderData.empresa.nome}.`;
    return {
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  errorComponent: () => <Aviso texto="Não foi possível carregar esta página de agendamento." />,
  notFoundComponent: () => <Aviso texto="Este link de agendamento não existe." />,
  component: AgendarPage,
});

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="board-bg flex min-h-screen items-center justify-center bg-cream px-4 text-ink">
      <p className="max-w-sm text-center text-sm text-inksoft">{texto}</p>
    </div>
  );
}

function AgendarPage() {
  const { empresa } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const buscarHorarios = useServerFn(getHorariosDisponiveis);
  const reservar = useServerFn(criarReservaPublica);

  const [etapa, setEtapa] = useState(1);
  const [servico, setServico] = useState<ServicoPublico | null>(null);
  const [data, setData] = useState(dataLocal(new Date()));
  const [hora, setHora] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [filiacao, setFiliacao] = useState("");
  const [enviando, setEnviando] = useState(false);

  const hoje = dataLocal(new Date());
  const proximosDias = Array.from({ length: 14 }, (_, i) => somaDias(hoje, i));

  const { data: horarios, isFetching } = useQuery({
    queryKey: ["horarios", slug, servico?.id, data],
    enabled: !!servico && etapa === 2,
    queryFn: () => buscarHorarios({ data: { slug, servicoId: servico!.id, data } }),
  });

  async function confirmar() {
    if (!servico || !hora) return;
    setEnviando(true);
    try {
      const res = await reservar({
        data: { slug, servicoId: servico.id, data, hora, nome, telefone, email, filiacao },
      });
      if (res.ok) setEtapa(4);
      else toast.error(res.erro);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível reservar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="board-bg min-h-screen bg-cream px-4 py-6 text-ink">
      <div className="mx-auto w-full max-w-lg">
        <header className="mb-4">
          <p className="text-xs font-medium tracking-[0.14em] text-branddeep uppercase">
            Agendamento online
          </p>
          <h1 className="mt-1 text-2xl text-balance font-display">{empresa.nome}</h1>
          <div className="mt-3 flex gap-1.5">
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className={`h-1 flex-1 rounded-full ${etapa >= n ? "bg-brand" : "bg-border"}`}
              />
            ))}
          </div>
        </header>

        <div className="overflow-hidden rounded-xl bg-paper p-4 shadow-board ring-1 ring-border">
          {etapa === 1 && (
            <section>
              <h2 className="text-lg font-display">Escolha o serviço</h2>
              <div className="mt-3 grid gap-2">
                {empresa.servicos.length === 0 && (
                  <p className="text-sm text-inksoft">Nenhum serviço disponível no momento.</p>
                )}
                {empresa.servicos.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setServico(s);
                      setHora(null);
                      setEtapa(2);
                    }}
                    className="flex items-center justify-between rounded-lg bg-cream/60 p-3 text-left ring-1 ring-border hover:ring-brand"
                  >
                    <span>
                      <span className="block text-sm font-medium">{s.nome}</span>
                      <span className="block text-xs text-inksoft">{s.duracao_min} min</span>
                    </span>
                    <span className="text-sm font-semibold font-display">{moeda(s.preco)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {etapa === 2 && servico && (
            <section>
              <h2 className="text-lg font-display">Data e horário</h2>
              <p className="text-xs text-inksoft">
                {servico.nome} · {servico.duracao_min} min · {moeda(servico.preco)}
              </p>

              <div className="mt-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {proximosDias.map((d) => {
                  const dow = new Date(`${d}T12:00:00-03:00`).getDay();
                  const ativo = empresa.dias_semana.includes(dow);
                  const on = d === data;
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={!ativo}
                      onClick={() => {
                        setData(d);
                        setHora(null);
                      }}
                      className={`min-w-14 shrink-0 rounded-lg px-2 py-2 text-center ring-1 ring-border ${
                        on ? "bg-brand text-cream" : "bg-cream/60"
                      } ${ativo ? "" : "opacity-35"}`}
                    >
                      <span className="block text-[10px]">{NOMES_DIAS[dow]}</span>
                      <span className="block text-sm font-medium">{d.slice(8)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                {isFetching && <p className="col-span-full text-sm text-inksoft">Buscando…</p>}
                {!isFetching && (horarios ?? []).length === 0 && (
                  <p className="col-span-full text-sm text-inksoft">
                    Sem horários livres nesta data.
                  </p>
                )}
                {(horarios ?? []).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHora(h)}
                    className={`rounded-lg py-2 text-sm ring-1 ring-border ${
                      hora === h ? "slot-on bg-brand text-cream" : "slot-fill"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEtapa(1)}
                  className="text-xs text-inksoft hover:text-ink"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={!hora}
                  onClick={() => setEtapa(3)}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-cream ring-1 ring-brand disabled:opacity-50"
                >
                  Continuar
                </button>
              </div>
            </section>
          )}

          {etapa === 3 && servico && hora && (
            <section>
              <h2 className="text-lg font-display">Seus dados</h2>
              <p className="text-xs text-inksoft">
                {servico.nome} · {data.split("-").reverse().join("/")} às {hora}
              </p>
              <form
                className="mt-3 grid gap-2.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  confirmar();
                }}
              >
                <Campo label="Nome completo" value={nome} onChange={setNome} required />
                <Campo
                  label="Telefone (WhatsApp)"
                  value={telefone}
                  onChange={setTelefone}
                  required
                  type="tel"
                />
                <Campo label="E-mail (opcional)" value={email} onChange={setEmail} type="email" />
                <Campo
                  label="Nome do pet ou dependente (opcional)"
                  value={filiacao}
                  onChange={setFiliacao}
                />
                <div className="mt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setEtapa(2)}
                    className="text-xs text-inksoft hover:text-ink"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={enviando}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-cream ring-1 ring-brand disabled:opacity-60"
                  >
                    {enviando ? "Reservando…" : "Confirmar reserva"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {etapa === 4 && servico && hora && (
            <section className="text-center">
              <span className="inline-block rounded-full bg-conf/15 px-3 py-1 text-xs font-medium text-conf">
                Reserva recebida · pendente
              </span>
              <h2 className="mt-3 text-xl font-display">Está no quadro, {nome.split(" ")[0]}!</h2>
              <p className="mt-2 text-sm text-inksoft">
                {servico.nome} em {empresa.nome}, dia {data.split("-").reverse().join("/")} às{" "}
                {hora}.
              </p>
              <p className="mt-1 text-xs text-inksoft">
                {empresa.nome} confirma pelo WhatsApp {telefone}
                {filiacao ? ` · ${filiacao}` : ""}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEtapa(1);
                  setServico(null);
                  setHora(null);
                  setNome("");
                  setTelefone("");
                  setEmail("");
                  setFiliacao("");
                }}
                className="mt-4 rounded-lg px-4 py-2 text-sm text-inksoft ring-1 ring-border"
              >
                Fazer outro agendamento
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-inksoft">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        maxLength={120}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg bg-cream/60 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-brand"
      />
    </label>
  );
}

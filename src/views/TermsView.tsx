import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

const sections = [
  {
    title: 'Precios y medios de pago',
    body: (
      <>
        Los precios del catálogo están en pesos argentinos y corresponden al pago en efectivo,
        transferencia o Mercado Pago (dinero en cuenta). Alias de transferencia:{' '}
        <strong className="font-semibold text-scn-text-title">somos.scn</strong>. Una vez pagado,
        enviá el comprobante por WhatsApp para confirmar el pedido.
      </>
    ),
  },
  {
    title: 'Stock y encargues',
    body: (
      <>
        El stock rota. La disponibilidad en la ficha es orientativa: para apartar un producto,
        confirmalo por WhatsApp. Si un ítem no está en el catálogo, también podés encargarlo;
        trabajamos con importadores y traemos modelos a pedido.
      </>
    ),
  },
  {
    title: 'Envíos y entrega',
    body: (
      <>
        En Bahía Blanca coordinamos entrega o punto de encuentro. Al resto del país enviamos por
        Correo Argentino; el costo y el plazo se confirman en el chat antes de cerrar.
      </>
    ),
  },
  {
    title: 'Cierre de la compra',
    body: (
      <>
        La compra se cierra por WhatsApp, no por un checkout online. Al escribirnos aceptás estas
        condiciones y la{' '}
        <Link to="/garantia" className="font-semibold text-[#6622CF] hover:underline">
          política de garantía
        </Link>
        .
      </>
    ),
  },
];

export default function TermsView() {
  usePageMeta({
    title: 'Condiciones de compra | SCN',
    description:
      'Condiciones de compra SCN: precios en pesos, medios de pago, envíos, stock y encargues fuera de catálogo.',
    path: '/condiciones',
  });

  return (
    <article className="space-y-8">
      <div className="space-y-7">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-lg font-bold tracking-tight text-scn-text-title">
              {section.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-scn-text-normal sm:text-[0.9375rem]">
              {section.body}
            </p>
          </section>
        ))}
      </div>
      <p className="border-t border-scn-border/40 pt-6 text-sm text-scn-text-normal">
        Para el paso a paso de una compra, mirá{' '}
        <Link to="/como-comprar" className="font-semibold text-[#6622CF] hover:underline">
          Cómo comprar
        </Link>
        .
      </p>
    </article>
  );
}

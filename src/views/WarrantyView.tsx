import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

const sections = [
  {
    title: 'Qué cubrimos',
    body: (
      <>
        Los productos se chequean antes de salir e ingresan de forma legal. Ante una{' '}
        <strong className="font-semibold text-scn-text-title">falla de fábrica</strong>, tenés{' '}
        <strong className="font-semibold text-scn-text-title">30 días corridos</strong> de prueba
        desde la entrega: coordinamos cambio o reparación según el caso.
      </>
    ),
  },
  {
    title: 'Cómo reclamar',
    body: (
      <>
        Escribinos por WhatsApp con el producto, el comprobante de compra y una breve descripción
        del problema. Respondemos en horario de atención y te indicamos los siguientes pasos.
      </>
    ),
  },
  {
    title: 'Qué no cubre',
    body: (
      <>
        La garantía no cubre golpes, humedad, uso indebido ni desgaste normal. Si el daño no es de
        fábrica, te lo explicamos con claridad para que sepas las opciones.
      </>
    ),
  },
  {
    title: 'Soporte posventa',
    body: (
      <>
        También ayudamos con la configuración inicial por el mismo canal. Si algo no cierra,
        preferimos resolverlo hablando, no con un ticket frío.
      </>
    ),
  },
];

export default function WarrantyView() {
  usePageMeta({
    title: 'Garantía | SCN',
    description:
      'Garantía SCN: productos chequeados, prueba de 30 días ante falla de fábrica y soporte posventa por WhatsApp.',
    path: '/garantia',
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
        ¿Tenés un caso concreto?{' '}
        <Link to="/contacto" className="font-semibold text-[#6622CF] hover:underline">
          Ir a contacto
        </Link>
        .
      </p>
    </article>
  );
}

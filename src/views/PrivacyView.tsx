import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

const sections = [
  {
    title: 'Qué datos usamos',
    body: (
      <>
        SCN vende por WhatsApp. Cuando nos escribís (o nos contactás por Instagram o correo),
        usamos tu nombre, número y el contenido del mensaje solo para responderte, coordinar pago
        y entrega, y darte soporte.
      </>
    ),
  },
  {
    title: 'Para qué',
    body: (
      <>
        No armamos perfiles publicitarios ni vendemos tu información a terceros. No pedimos datos
        de tarjeta en el sitio: el pago se coordina por los canales oficiales de SCN.
      </>
    ),
  },
  {
    title: 'Medición del sitio',
    body: (
      <>
        Contamos visitas de forma anónima para saber qué productos interesan: un identificador
        aleatorio guardado en tu navegador (sin nombre, mail ni número), el tipo de dispositivo y
        la página. No usamos cookies de terceros ni lo compartimos con nadie, y no se usa para
        publicidad personalizada.
      </>
    ),
  },
  {
    title: 'Sorteos',
    body: (
      <>
        Si participás de un sorteo, guardamos solo los datos que pide el formulario (nombre,
        WhatsApp y/o mail) para elegir al ganador al azar y contactarlo. No los usamos para otra
        cosa ni los compartimos. Podés pedir que borremos tu participación escribiéndonos por
        WhatsApp.
      </>
    ),
  },
  {
    title: 'Borrado o consulta',
    body: (
      <>
        Si querés que borremos un chat o un dato que nos hayas dejado, pedilo por WhatsApp o al
        correo publicado en contacto. Respondemos en horario de atención.
      </>
    ),
  },
];

export default function PrivacyView() {
  usePageMeta({
    title: 'Privacidad | SCN',
    description:
      'Cómo SCN usa tus datos cuando nos escribís por WhatsApp, Instagram o correo: solo para responderte y coordinar tu compra.',
    path: '/privacidad',
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
        Canales oficiales en{' '}
        <Link to="/contacto" className="font-semibold text-[#6622CF] hover:underline">
          Contacto
        </Link>
        .
      </p>
    </article>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function SpanishNotFound() {
  return (
    <div className="page-block">
      <div className="wrap page-hero">
        <p className="kicker">404</p>
        <h1>Esa página no está.</h1>
        <p className="lede">El enlace puede tener una letra de más, o esa edición todavía no existe.</p>
        <p style={{ marginTop: 18 }}>
          <Link className="btn btn-ink" href="/es/buenas-noticias">
            Ver las ediciones
          </Link>
        </p>
      </div>
    </div>
  );
}

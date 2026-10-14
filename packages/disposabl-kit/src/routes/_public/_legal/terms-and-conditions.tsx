import { createFileRoute } from "@tanstack/react-router";
import { T } from "gt-react";

export const Route = createFileRoute("/_public/_legal/terms-and-conditions")({
  component: TermsAndConditions,
});

function TermsAndConditions() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <h1 className="text-3xl font-semibold">
        <T>Terms and conditions</T>
      </h1>
      <article className="space-y-6 leading-7">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            <T>Using the service</T>
          </h2>
          <p>
            <T>
              Use the service responsibly. Do not misuse it, interfere with
              other users, or attempt to access accounts or data without
              permission.
            </T>
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            <T>Your account and content</T>
          </h2>
          <p>
            <T>
              Keep your sign-in details secure. Only submit content you have
              permission to use, and take responsibility for your account
              activity.
            </T>
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            <T>About these terms</T>
          </h2>
          <p>
            <T>
              These are basic terms for this starter application. The
              application owner should update this page with the terms that
              apply to their service before launch.
            </T>
          </p>
        </section>
      </article>
      <nav className="flex gap-4 text-sm" aria-label="Legal">
        <a className="underline underline-offset-4" href="/privacy-policy">
          <T>Privacy policy</T>
        </a>
        <a className="underline underline-offset-4" href="/">
          <T>Home</T>
        </a>
      </nav>
    </main>
  );
}

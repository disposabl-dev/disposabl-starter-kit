import { createFileRoute, Link } from "@tanstack/react-router";
import { T } from "gt-react";

export const Route = createFileRoute("/_public/_legal/privacy-policy")({
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <article className="mx-auto max-w-2xl space-y-8 px-6 py-12 leading-7">
      <h1 className="text-3xl font-semibold">
        <T>Privacy policy</T>
      </h1>
      <p className="text-muted-foreground">
        <T>
          This starter page should be updated by the application owner to
          describe how the service handles personal information.
        </T>
      </p>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          <T>Information you provide</T>
        </h2>
        <p>
          <T>
            When you create an account or use the service, you may provide
            account details and content. The application owner should explain
            what is collected and how it is used.
          </T>
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          <T>Cookies and service providers</T>
        </h2>
        <p>
          <T>
            The service may use cookies and third-party providers for features
            such as sign-in and hosting. Review the cookie preferences available
            in the application.
          </T>
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          <T>Your information</T>
        </h2>
        <p>
          <T>
            The application owner should provide a contact method for privacy
            questions and requests, along with details about data retention and
            deletion.
          </T>
        </p>
      </section>
      <nav className="flex gap-4 text-sm underline" aria-label="Legal">
        <Link to="/">
          <T>Home</T>
        </Link>
        <Link to="/terms-and-conditions">
          <T>Terms and conditions</T>
        </Link>
      </nav>
    </article>
  );
}

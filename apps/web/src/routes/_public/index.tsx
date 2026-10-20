import { createFileRoute } from "@tanstack/react-router";
import { T } from "gt-react";
import { Image } from "@disposabl/disposabl-kit/client";

export const Route = createFileRoute("/{-$lang}/_public/")({
  component: Home,
});

function Home() {
  return (
    <main>
      <div>
        <T>Hello World</T>
      </div>
      <Image
        src="https://cdn.shopify.com/static/sample-images/bath.jpeg"
        alt=""
        width={1200}
        height={800}
        priority
        className="mx-auto rounded-xl"
      />
    </main>
  );
}

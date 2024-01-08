import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
  json,
  redirect,
} from "@remix-run/node";

import { db } from "../utils/db.server";
import {
  Form,
  Link,
  isRouteErrorResponse,
  useLoaderData,
  useParams,
  useRouteError,
} from "@remix-run/react";
import { getUserId, requireUserId } from "../utils/session.server";
import { JokeDisplay } from "~/components/joke";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const { description, title } = data
    ? {
        description: `Read the joke "${data.joke.name}"`,
        title: `${data.joke.name} Joke | Remix Jokes`,
      }
    : { description: "No joke found", title: "No joke" };
  return [
    { name: "description", content: description },
    { name: "twitter:description", content: description },
    { title },
  ];
};

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  const jokeId = params.jokeId;
  const joke = await db.joke.findUnique({
    where: { id: jokeId },
    select: { id: true, name: true, content: true, jokesterId: true },
  });
  if (!joke) {
    throw new Response("What a joke! Not found.", {
      status: 404,
    });
  }
  return json({
    joke,
    isOwner: userId === joke.jokesterId,
  });
};

export default function JokeRoute() {
  const { joke, isOwner } = useLoaderData<typeof loader>();

  return (
    <JokeDisplay
      isOwner={isOwner}
      joke={joke}
    />
  );
}

export async function action({ params, request }: ActionFunctionArgs) {
  const form = await request.formData();
  if (form.get("intent") !== "delete") {
    throw new Response(`The intent ${form.get("intent")} is not supported.`, {
      status: 400,
    });
  }
  const userId = await requireUserId(request);
  const joke = await db.joke.findUnique({
    where: { id: params.jokeId },
  });
  if (!joke) {
    throw new Response("Can't delete a joke that doesn't exist.", {
      status: 404,
    });
  }
  if (joke.jokesterId !== userId) {
    throw new Response("You can't delete a joke you didn't create.", {
      status: 403,
    });
  }
  await db.joke.delete({ where: { id: params.jokeId } });
  return redirect("/jokes");
}

export function ErrorBoundary() {
  const { jokeId } = useParams();
  const error = useRouteError();
  console.error(error);

  if (isRouteErrorResponse(error)) {
    if (error.status === 400) {
      return (
        <div className="error-container">
          What you're trying to do is not allowed.
        </div>
      );
    }
    if (error.status === 403) {
      return (
        <div className="error-container">
          Sorry, but "{jokeId}" is not your joke.
        </div>
      );
    }
    if (error.status === 404) {
      return (
        <div className="error-container">Huh? What the heck is "{jokeId}"?</div>
      );
    }
  }
  return (
    <div className="error-container">
      There waas an error loading the joke with id "${jokeId}". Sorry.
    </div>
  );
}

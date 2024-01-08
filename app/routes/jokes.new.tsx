import {
  redirect,
  type ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  MetaFunction,
} from "@remix-run/node";

import { db } from "../utils/db.server";
import { badRequest } from "../utils/request.server";
import {
  Form,
  Link,
  isRouteErrorResponse,
  useActionData,
  useNavigation,
  useRouteError,
} from "@remix-run/react";
import { getUserId, requireUserId } from "../utils/session.server";
import { JokeDisplay } from "~/components/joke";

function validateJokeContent(content: string) {
  if (content.length < 10) {
    return "That joke was too short";
  }
}

function validateJokeName(name: string) {
  if (name.length < 3) {
    return "That joke's name is too short";
  }
}

export const meta: MetaFunction = () => {
  const description = "Add your own hilarious joke";
  const title = "New Joke | Remix Jokes";

  return [
    { name: "description", content: description },
    { name: "twitter:description", content: description },
    { title },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);

  if (!userId) {
    throw new Response("Unauthorized", {
      status: 401,
    });
  }
  return json({});
};

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);

  const formData = await request.formData();
  const name = formData.get("name");
  const content = formData.get("content");

  if (typeof content !== "string" || typeof name !== "string") {
    return badRequest({
      fieldErrors: null,
      fields: null,
      formError: "Form not submitted correctly.",
    });
  }

  const fieldErrors = {
    content: validateJokeContent(content),
    name: validateJokeName(name),
  };
  const fields = { content, name };
  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({
      fieldErrors,
      fields,
      formError: null,
    });
  }

  const joke = await db.joke.create({
    data: { ...fields, jokesterId: userId },
  });

  return redirect(`/jokes/${joke.id}`);
}

export default function NewJokeRoute() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  if (navigation.formData) {
    const content = navigation.formData.get("content");
    const name = navigation.formData.get("name");
    if (
      typeof content === "string" &&
      typeof name === "string" &&
      !validateJokeContent(content) &&
      !validateJokeName(name)
    ) {
      return (
        <JokeDisplay
          canDelete={false}
          isOwner={true}
          joke={{ name, content }}
        />
      );
    }
  }

  return (
    <div>
      <p>Add your own hilarious joke</p>
      <Form method="post">
        <div>
          <label>
            Name:{" "}
            <input
              type="text"
              name="name"
              defaultValue={actionData?.fields?.name}
              aria-invalid={Boolean(actionData?.fieldErrors?.name)}
              aria-errormessage={
                actionData?.fieldErrors?.name ? "name-error" : undefined
              }
            />
          </label>
          {actionData?.fieldErrors?.name && (
            <p
              id="name-error"
              className="form-validation-error"
              role="alert"
            >
              {actionData.fieldErrors.name}
            </p>
          )}
        </div>
        <div>
          <label>
            Content:{" "}
            <textarea
              name="content"
              defaultValue={actionData?.fields?.content}
              aria-invalid={Boolean(actionData?.fieldErrors?.content)}
              aria-errormessage={
                actionData?.fieldErrors?.content ? "content-error" : undefined
              }
            />
          </label>

          {actionData?.fieldErrors?.content && (
            <p
              id="content-error"
              className="form-validation-error"
              role="alert"
            >
              {actionData.fieldErrors.content}
            </p>
          )}
        </div>
        <div>
          <button
            type="submit"
            className="button"
          >
            Add
          </button>
        </div>
      </Form>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error(error);

  if (isRouteErrorResponse(error) && error.status === 401) {
    return (
      <div className="error-container">
        <p>You must be logged in to add a joke.</p>
        <Link to="/login">Login</Link>
      </div>
    );
  }
  return (
    <div className="error-container">
      Something unexpected went wrong. Sorry about that.
    </div>
  );
}

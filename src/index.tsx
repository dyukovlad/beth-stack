import { Elysia, t } from 'elysia';
import { html } from '@elysiajs/html';
import * as elements from 'typed-html';
import { db } from './db';
import { Todo, todos } from './db/schema';
import { eq } from 'drizzle-orm';

const app = new Elysia()
  .use(html())
  .get('/', ({ html }) =>
    html(
      <BaseHtml>
        <body
          class="flex w-full h-screen justify-center items-center"
          hx-get="/todos"
          hx-trigger="load"
          hx-swap="innerHTML"
        />
      </BaseHtml>
    )
  )
  .get('/todos', async () => {
    const data = await db.select().from(todos).all();
    return <TodoList todos={data} />;
  })
  .post(
    '/todos/toggle/:id',
    async ({ params }) => {
      const oldTodo = await db
        .select()
        .from(todos)
        .where(eq(todos.id, Number(params.id)))
        .get();
      const newTodo = await db
        .update(todos)
        .set({ completed: !oldTodo.completed })
        .where(eq(todos.id, Number(params.id)))
        .returning()
        .get();
      return <TodoItem {...newTodo} />;
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    }
  )
  .delete(
    '/todos/:id',
    async ({ params }) => {
      await db
        .delete(todos)
        .where(eq(todos.id, Number(params.id)))
        .run();
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    }
  )
  .post(
    '/todos',
    async ({ body }) => {
      if (body.content.length === 0) {
        throw new Error('Content cannot be empty.');
      }
      const newTodo = await db.insert(todos).values(body).returning().get();
      return <TodoItem {...newTodo} />;
    },
    {
      body: t.Object({
        content: t.String({ minLength: 1 }),
      }),
    }
  )
  .listen(3000);

const BaseHtml = ({ children }: elements.Children) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>The Beth Stack</title>
        <script src="https://unpkg.com/htmx.org@1.9.3"></script>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>      
        ${children}
    </html>
  `;

/**
 * Render a single todo item.
 *
 * @param {Todo} content - The content of the todo item.
 * @param {boolean} completed - Whether the todo item is completed or not.
 * @param {string} id - The unique identifier of the todo item.
 * @return {JSX.Element} - The rendered todo item.
 */
const TodoItem = ({ content, completed, id }: Todo) => (
  <div class="flex flex-row space-x-3">
    <p>{content}</p>
    <input
      type="checkbox"
      checked={completed}
      hx-post={`/todos/toggle/${id}`}
      hx-target="closest div"
      hs-swap="outerHTML"
    />
    <button
      class="text-red-600"
      hx-delete={`/todos/${id}`}
      hx-target="closest div"
      hs-swap="outerHTML"
    >
      X
    </button>
  </div>
);

/**
 * Renders a list of todos.
 *
 * @param {Todo[]} todos - The array of todos to render.
 * @return {JSX.Element} The rendered list of todos.
 */
const TodoList = ({ todos }: { todos: Todo[] }) => (
  <div>
    {todos.map((todo: Todo) => (
      <TodoItem {...todo} />
    ))}
    <TodoForm />
  </div>
);

const TodoForm = () => {
  return (
    <form
      class="flex flex-row space-x-3"
      hx-post="/todos"
      hx-swap="beforebegin"
    >
      <input type="text" name="content" class="border border-black" />
      <button type="submit">Submit</button>
    </form>
  );
};

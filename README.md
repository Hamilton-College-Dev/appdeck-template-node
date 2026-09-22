# Node.js project site

A small working web app. Clone it, change it, push it, and it goes live.

You do **not** need an AWS account, and you will not be given one. Hosting is
handled for you. There is nothing to sign up for.

---

## Run it on your computer

You need [Node.js 22 or newer](https://nodejs.org). Check with `node --version`.

```bash
npm install
npm start
```

Open <http://localhost:8080>. You should see "It works." and a box to add notes.

While you're building, use this instead so the server restarts every time you
save a file:

```bash
npm run dev
```

Run the tests any time with:

```bash
npm test
```

---

## Where to put your code

```
src/
  server.js    <- start here. Your pages and routes live in this file.
  views.js     <- the HTML and CSS for those pages.
  router.js    <- small helpers. You can ignore this.
  db.js        <- reading and writing data.
test/
  app.test.js  <- the tests. Add to these as you add features.
Dockerfile     <- how your app gets packaged. Leave it alone unless you know why.
```

Adding a page takes two lines in `src/server.js`:

```js
routes.get('/about', async () => html(200, views.page('About', '<h1>About us</h1>')));
```

### Two rules you can't change

1. **The app listens on port 8080.** The hosting platform sends traffic there.
2. **`GET /healthz` returns 200.** The platform checks that address constantly
   to decide whether your app is alive. If it stops answering, your site stops
   getting visitors, even if every other page is perfect.

Both are already set up. Just don't delete them.

---

## Saving data

The app works with or without a database, and it figures out which on its own.

- **No database:** notes are kept in memory. They disappear when the app
  restarts. This is the default, and it's fine for local development.
- **With a database:** notes are saved to PostgreSQL and stick around.

The switch is an environment variable called `DATABASE_URL`. If your project
asked for a database, the platform sets it for you when your app runs. You never
type it in, and you never commit it. If it isn't set, the app quietly falls back
to memory.

To use a real database on your own machine, copy `.env.example` to `.env` and
fill in your local PostgreSQL connection string. `.env` is git-ignored, so it
won't be committed.

Check which one you're on at any time by visiting `/api/status`.

---

## Deploying

Push to `main`. That's the whole process.

```bash
git add .
git commit -m "Added the about page"
git push
```

Then open the **Actions** tab at the top of this repository on GitHub. You'll
see your deploy running. Green check means it's live. Give it about a minute,
then reload your site.

Deploys happen in this order, and any step can stop the whole thing:

1. Your tests run.
2. Your app is packaged up.
3. It's started once and checked that `/healthz` answers. This catches most
   problems here, in seconds, instead of on the live site.
4. It's handed to the hosting platform, which swaps it in.

### When a deploy fails

Open the Actions tab, click the red run, then click the step that failed. The
error is at the bottom of the log. The usual suspects:

| What you see | What it means |
|---|---|
| `Run the tests` is red | A test broke. Run `npm test` locally and fix it. |
| `The app never answered /healthz` | Your app crashed on startup, or stopped listening on 8080. The container's log is printed right below that error. |
| `This repository is missing settings` | Something wasn't set up on the project. Not your fault, and not something to fix yourself. Ask the web team. |
| `Build the image` is red | Usually a typo in `package.json` or a package that doesn't exist. |
| It's all green but the site looks old | Give it another minute, then hard-reload (Cmd-Shift-R or Ctrl-Shift-R). |

If the deploy is green and the site still isn't right, the problem is in your
code, not the deploy. Check the logs.

---

## Keep it small

Your app runs in **512 MB of memory with a quarter of a CPU core**. That's a
fixed budget, not a suggestion, and it's what keeps these project sites cheap
enough for the College to offer for free.

In practice that means: think before adding a package. This template ships with
exactly one dependency (a PostgreSQL driver) and everything else is built into
Node. A handful of small libraries is fine. Pulling in something that wants a
gigabyte of RAM is not, and it will show up as your site restarting over and
over. `npm install some-huge-framework` is the most common way students break
their own site.

---

## Settings the platform fills in

These are set on the repository when your project is created. The deploy
workflow reads them. **Don't type these values into any file** and don't change
them. They're listed here so you can tell what's handed to you and what's yours.

| Setting | Example value | What it's for |
|---|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::111122223333:role/appdeck-deploy-yourproject` | Lets this repository, and only this repository, sign in to deploy. |
| `AWS_REGION` | `us-east-1` | Which data center your site runs in. |
| `ECR_REPOSITORY` | `appdeck/yourproject` | Where your packaged app is stored. |
| `ECS_SERVICE` | `appdeck-yourproject` | The name of your running site. |
| `ECS_EXECUTION_ROLE_ARN` | `arn:aws:iam::111122223333:role/appdeck-task-execution` | Lets the platform start your app. |
| `ECS_INFRASTRUCTURE_ROLE_ARN` | `arn:aws:iam::111122223333:role/appdeck-infrastructure` | Lets the platform manage your site's networking. |
| `ECS_CLUSTER` | `appdeck` | Which pool your site runs in. Optional. |

You can see the real values under **Settings → Secrets and variables → Actions
→ Variables**. They're variables, not secrets, so there's nothing sensitive in
them and nothing to protect.

There are **no AWS access keys anywhere in this repository**, and there should
never be. Deploys sign in with a token GitHub creates fresh for each run and
throws away after. If you ever find yourself adding `AWS_ACCESS_KEY_ID` to a
file, stop and ask the web team, because something has gone wrong.

---

## Getting help

Stuck on your own code? Normal Node.js and JavaScript questions are yours to
research.

Stuck on the deploy, the settings, or the database? That's the web team.

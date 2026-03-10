> __BEFORE STARTING__: `Ctrl` + `F` for `"TEMPLATE:"` and perform all described actions, then remove this note.

# Project Template

Before starting, install the following and ensure they are in your `PATH`:
- Python 3.11+
- Node 22+
- Docker (with Compose)
- Google Cloud SDK (authenticate and set project)
- VSCode or a derivative IDE (recommend Windsurf)
- Git Bash (on Windows)

# Introduction

This document is high-level. Additional documentation is available:
- `doc/DESIGN.md` contains high-level design documentation.
- `infra/gcp/README.md` contains documentation on managing GCP deployments.
- Backend development documentation is primarily inline:
    - Run task `Workspace: Start Backend Docs` for code documentation on `http://localhost:7900`.
    - `http://localhost/api/v1/docs` has API documentation when `Local: Start API` is running.
- App development documentation is primarily inline:
    - Run task `Workspace: Start App Docs` for code documentation on `http://localhost:7901`.

## Project Structure

This repository is laid out as follows:
- `backend/backend` implements all backend services, including the API.
- `app/src` implements the frontend application.
- `infra/local` contains Docker Compose definitions for local deployments.
- `infra/gcp` contains IaC for GCP deployments.
- `scripts` contains scripts automating the local development environment, CI/CD, and cloud deployments.

The following general stacks are used:
- Backend:
    - Python 3
    - FastAPI
    - SQLAlchemy
    - Pydantic
    - Pylint
    - Pytest
- Frontend:
    - TypeScript
    - React
    - Chakra UI and SaaS UI
    - Vite
    - ESLint
    - Jest
- Infrastructure:
    - Docker
    - Docker Compose
    - Google Cloud SDK
    - Terraform
    - Github Actions

## Running Tasks

Almost all developer actions are implemented as tasks integrated into your IDE.

To run a task, press `Ctrl + Shift + P`, select `Tasks: Run Task`, then type the task name and press Enter.

> Tasks are defined in `.vscode/tasks.json`.

## Windows-specific Setup

This repo is set up for OSX. If you are on Windows, create the following files:
- `<repo>/.bin/python3`
- `<repo>/.bin/python3.11`

Both with these contents:
```bash
#!/bin/bash
exec python "$@"
```

This allows scripts to work around OSX virtual environment activations on your platform.

## Dependency Installs

To install Python and Node requirements for the local deployment, run task `Workspace: Install Requirements`. You can run a containerized local deployment without Python and Node.

# Local Deployments

There are two local deployment types:
- Task `Local: Start All` starts a deployment with first-party services running directly on the host to enable HMR. Use this for application development.
- Task `Local Containerized: Start All` starts a deployment with all first-party services running in containers. Use this for containerization work and production build verifications.

Once you run one of the above tasks, run task `Local Init: Run All` to initialize the local deployment. You can run this at any time to reset your local deployment's state. It:
- Resets the database schema, then runs all migrations.
- Creates a default admin user with email `admin@admin.com` / password `admin`.
- Populates the location database.

In both types of local deployment:
- The app is served on `http://localhost`.
- The API is served on `http://localhost/api`.
- The video streaming API is served on `http://localhost/streams`.
- A background task service runs deferred and recurring workloads.

## Local Deployment Integrations

Integrations such as cloud storage backends and SMTP dispatch will not function in local deployments unless configured. To do this:
- Run task `Workspace: Configure Local Integrations` and follow the prompts.
- Restart the local deployment if it is running.

# Codegen Scripts

> Run task `Codegen: All` to run all codegen scripts before merging to trunk branches. CI will fail if there are uncommitted changes after code generation.

### Backend Model Conversion for App

Code generation is used to provide `app/src` with definitions from `backend/backend` to prevent duplication.

This includes:
- Pydantic model types.
- API endpoint bindings.
- The authorization schema.

To generate the TypeScript definitions of these, run task `Codegen: Update App Definitions`.

### I18n Message Collection

Both `app/src` and `backend/backend` use English-as-key i18n whenever text is presented to the user. They share the locale JSON files in `common/locales`.

Run task `Codegen: Collect EN Locale` to automatically collect the English messages in `en_US.json`. This works by searching relevant source for calls to `t(...)`. It also collects messages from `common/campaign-brief.yaml`.

Non-English messages can then be generated from the English messages.

# Quality Control

This repo contains a variety of QC safeguards. Each described check has both a task you can run locally, and a CI step.
- Against `app`;
    - Task `Checks: Verify App Build` validates no TS build errors are present.
    - Task `Checks: Lint App` validates ESLint is passing.
    - Task `Checks: Test App` validates Jest unit tests are passing.
    - Checks against task `Codegen: All` ensure, among other things, that app type and API bindings are up to date.
- Against `backend`;
    - Task `Checks: Lint Backend` ensures Pylint is passing.
    - Task `Checks: Test Backend` validates pytest unit tests are passing.
    - Integration tests against the API are in place as described below.

## Flow Tests

The `backend/flow_tests` module implements a step-based suite of integration tests
that validate API behavior. This suite can be run with task `Checks: Backend Flow Tests`.

To extend the flow tests:
- Run task `Workspace: Flow Tests Dev`. This will create a Compose deployment isolated from the normal local deployment that is configured for integration testing, then give you a shell.
- Implement a new step.
- Run `python flow_tests run -s <step>` in the provided shell to run the chain of steps up to the `<step>` you are developing.

## Manual Testing on Local

Some functionalities exist to support conducting manual test cases in local deployments:
- Some workflow-blocking validation errors are downgraded to warnings when `DEV_MODE=true`, which it is locally.
- Realistic analytics data is returned from the dummy analytics backend.
- The CLI command `python backend dev timetravel --hours <hours> --days <days>` allows you to emulate progress in time by a specified number of hours and days.

# Operational Process

CI/CD tooling is set up for a specific operational flow:
- All changes are made in feature branches, named with the format `feat/<feature-name>`, or `bug/<bug-description>`.
- Feature branches are merged with squash commits into the `dev` branch, which contains the next release's working set of changes.
    - CD deploys a Dev environment from the `dev` branch.
    - The Dev environment should be configured to use mock ad platform backends.
- Release candidates are merged from `dev` branch, with merge commits, into the `test` branch.
    - CD deploys a test environment from the `test` branch where user acceptance testing can be performed.
    - Release candidate builds are automatically tagged by CD as `<next release version>.rc/<commit sha>`
    - The test environment should be configured to use live ad platform backends, in sandbox/test mode where supported.
- Releases are merged from `test` branch, with merge commits, into the `main` branch.
    - CD deploys a Production environment from the `main` branch.
    - Release builds are automatically tagged by CD as `<major version>.<minor version>`.
    - The Production environment should be configured to use live ad platform backends.

## Migrations

A structured migrations process exists to handle changes to the database schema.
- Alembic migrations are committed to `backend/migrations`.
- CI into trunk branches ensures that whenever a data model change is made, a corresponding migration exists.
- Cloud deployments run migrations automatically against the corresponding environment.

Assuming you ran `Local Init: Run All` from a clean `dev` branch before starting your feature implementation, the process is:
- Update any SQLAlchemy mappers as needed.
- Run task `Local: Make Migration` and enter a commit-message equivalent.
- Manually update the generated migration file as needed.
- Run task `Local: Migrate to HEAD` to ensure that it works.
- Continue with your feature implementation.

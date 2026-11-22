# ReadQuest backend

## Windows setup

On Python 3.15, force prebuilt dependency wheels. This prevents `pip` from
building `pydantic-core` with Rust, which can be blocked by Windows Application
Control when it runs a temporary compiler executable.

```powershell
py -m pip install --only-binary=:all: -r requirements.txt
```

Run the backend from this directory:

```powershell
py -m app
```

The demo seed reads only the checked-in JSON fixtures:

```powershell
py -m app.seeds.demo
py -m app.seeds.demo
```

The default local database is `sqlite:///./readquest.db`. Set `DATABASE_URL`
to a PostgreSQL URL when running the Alembic migrations.

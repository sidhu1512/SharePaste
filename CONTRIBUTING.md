# Contributor Guidelines

Thank you for considering contributing to **SharePaste**! This project aims to provide a fast, server‑less code‑sharing experience. Please follow these guidelines to keep the codebase clean and consistent.

## Getting Started

1. **Fork** the repository and clone your fork.
2. Install dependencies (if any) – the project is pure HTML/JS, but for linting we use `prettier` and `htmlhint`:
   ```bash
   npm ci
   ```
3. Run the local server to test changes:
   ```bash
   python -m http.server 8000
   ```
4. Open `http://localhost:8000` in a browser.

## Development Workflow

- **Branching**: Create a new branch for each feature or bug fix.
- **Commit Messages**: Use conventional commits, e.g., `feat: add adaptive sharing` or `fix: correct typo`.
- **Pull Requests**: Submit a PR against `main`. Include a clear description of what changed and why.
- **Testing**: Ensure the CI passes (`prettier --check . && npx htmlhint .`). Manual testing of UI changes is also required.

## Code Style

- Run `npm run format` before committing (uses Prettier).
- Keep HTML indentation consistent (2 spaces).
- Use Tailwind classes as‑is; avoid custom CSS unless necessary.

## Issues & Feature Requests

- Open an issue with a clear title and description.
- Include screenshots or GIFs when proposing UI changes.

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

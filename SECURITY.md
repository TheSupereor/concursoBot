# Security Policy

## Supported versions

This project is under active development and has no stable release yet. Only the `main` branch receives security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Use GitHub's private vulnerability reporting: go to the **Security** tab of this repository and choose **Report a vulnerability**. Include:

- a description of the issue and its impact,
- steps to reproduce (or a proof of concept),
- affected commit or version, if known.

You can expect an acknowledgement within 5 business days. Fixes are coordinated privately and disclosed after a patch is available.

## Handling of secrets and personal data

- Never commit `.env` files, Telegram bot tokens or Stripe keys. Use `.env.example` as the template.
- The service stores Telegram user IDs and subscription preferences. Payment card data is handled exclusively by Stripe and never touches this application.

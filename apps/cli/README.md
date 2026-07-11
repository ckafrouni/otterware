# Otterware CLI

```bash
npm install --global otterware
otterware auth login
otterware artifacts --help
```

Publish a website directory or a single Markdown, CSV, TSV, or Excel workbook file. Otterware detects the entry file and the web app provides a dedicated document preview:

```bash
otterware artifacts create ./report.xlsx \
  --slug quarterly-report \
  --title "Quarterly report" \
  --visibility organization
```

See the repository README for authentication, organizations, artifact commands, and self-hosting instructions.

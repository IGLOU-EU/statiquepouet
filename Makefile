# StatiquePouet task runner. Thin wrapper over the npm scripts.
# Indentation MUST be tabs.

.DEFAULT_GOAL := help
.PHONY: help test build-dev build serve clean

# Override the port at the command line with `PORT=8001 make serve`.
PORT ?= 8000

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

test: ## Run the test suite (unit + live network tests)
	npm test

build-dev: ## Dev build (TS bundle with sourcemap, no minify, no CSS)
	npm run build:dev

build: ## Release build (minified TS bundle, light + dark CSS themes)
	npm run build

serve: ## Serve demo + showcase on http://localhost:$(PORT)
	@echo "  demo:     http://localhost:$(PORT)/demo/index.html"
	@echo "  showcase: http://localhost:$(PORT)/demo/showcase.html"
	@echo
	@python3 -m http.server $(PORT)

clean: ## Remove dist/ and build-test/
	npm run clean

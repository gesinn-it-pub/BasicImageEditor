-include .env
export

ifeq (,$(wildcard ./build/))
    $(shell git submodule update --init --remote)
endif

EXTENSION      = BasicImageEditor

# docker images
MW_VERSION    ?= 1.43
PHP_VERSION   ?= 8.3
DB_TYPE       ?= mysql
DB_IMAGE      ?= "mariadb:11.2"

# composer
COMPOSER_EXT  ?= true

# nodejs
NODE_JS       ?= true

include build/Makefile

.PHONY: composer-phan composer-phan-update-baseline
composer-phan: .init
ifdef COMPOSER_EXT
	$(show-current-target)
	$(compose-exec-wiki) bash -c "cd $(EXTENSION_FOLDER) && composer phan $(COMPOSER_PARAMS)"
endif

composer-phan-update-baseline: .init
ifdef COMPOSER_EXT
	$(show-current-target)
	$(compose-exec-wiki) bash -c "cd $(EXTENSION_FOLDER) && composer phan -- --save-baseline=.phan/baseline.php"
endif

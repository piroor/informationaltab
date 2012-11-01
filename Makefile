PACKAGE_NAME = informationaltab

all: xpi

xpi:
	cp buildscript/makexpi.sh ./
	./makexpi.sh -n $(PACKAGE_NAME)
	rm ./makexpi.sh

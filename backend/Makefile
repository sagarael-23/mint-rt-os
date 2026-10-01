CC     = gcc
CFLAGS = -Wall -Wextra -std=gnu11 -O2
TARGET = mint-rt-backend
SRC    = src/main.c src/process.c src/monitor.c

all: $(TARGET)

$(TARGET): $(SRC) src/process.h src/monitor.h
	$(CC) $(CFLAGS) -o $(TARGET) $(SRC)

clean:
	rm -f $(TARGET)
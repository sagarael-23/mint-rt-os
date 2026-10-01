CC      = gcc
CFLAGS  = -Wall -Wextra -std=gnu11 -O2
TARGET  = mint-rt-backend
SRC     = src/main.c src/process.c src/monitor.c src/scheduler.c src/deadline.c
HEADERS = src/process.h src/monitor.h src/scheduler.h src/deadline.h

TEST_SCHED     = test_scheduler
TEST_SCHED_SRC = tests/test_scheduler.c src/scheduler.c src/deadline.c

all: $(TARGET)

$(TARGET): $(SRC) $(HEADERS)
	$(CC) $(CFLAGS) -o $(TARGET) $(SRC)

$(TEST_SCHED): $(TEST_SCHED_SRC) $(HEADERS)
	$(CC) $(CFLAGS) -o $(TEST_SCHED) $(TEST_SCHED_SRC)

test: $(TEST_SCHED)
	./$(TEST_SCHED)

clean:
	rm -f $(TARGET) $(TEST_SCHED)

.PHONY: all test clean
CC      = gcc
CFLAGS  = -Wall -Wextra -std=gnu11 -O2
TARGET  = mint-rt-backend
SRC     = src/main.c src/process.c src/monitor.c src/scheduler.c src/deadline.c src/logger.c
HEADERS = src/process.h src/monitor.h src/scheduler.h src/deadline.h src/logger.h

TEST_SCHED     = test_scheduler
TEST_SCHED_SRC = tests/test_scheduler.c src/scheduler.c src/deadline.c src/logger.c

TEST_LOG       = test_logger
TEST_LOG_SRC   = tests/test_logger.c src/logger.c src/scheduler.c src/deadline.c

all: $(TARGET)

$(TARGET): $(SRC) $(HEADERS)
	$(CC) $(CFLAGS) -o $(TARGET) $(SRC)

$(TEST_SCHED): $(TEST_SCHED_SRC) $(HEADERS)
	$(CC) $(CFLAGS) -o $(TEST_SCHED) $(TEST_SCHED_SRC)

$(TEST_LOG): $(TEST_LOG_SRC) $(HEADERS)
	$(CC) $(CFLAGS) -o $(TEST_LOG) $(TEST_LOG_SRC)

test: $(TEST_SCHED) $(TEST_LOG)
	./$(TEST_SCHED)
	./$(TEST_LOG)

clean:
	rm -f $(TARGET) $(TEST_SCHED) $(TEST_LOG)

.PHONY: all test clean
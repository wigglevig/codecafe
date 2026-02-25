# Use a specific version of Corretto 17 on Alpine Linux for a smaller image
FROM amazoncorretto:17-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy the Maven wrapper and pom.xml first to leverage Docker cache
COPY .mvn/ .mvn
COPY mvnw pom.xml ./

# Download dependencies
# Using "go-offline" can speed up builds if you build frequently without pom.xml changes
RUN ./mvnw dependency:go-offline -B

# Copy the source code
COPY src ./src

# Build the application
# -DskipTests to skip running tests during Docker build
RUN ./mvnw package -DskipTests -B

# Second stage: Create the final, smaller image
FROM amazoncorretto:17-alpine

# Set the working directory
WORKDIR /app

# Argument to specify the JAR file name (optional, defaults to app.jar)
ARG JAR_FILE_PATH=target/*.jar

# Copy the JAR file from the builder stage
COPY --from=builder /app/${JAR_FILE_PATH} app.jar

# Expose the port the application runs on
EXPOSE 8080

# Health check (adjust path and port if your actuator health endpoint is different)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:8080/actuator/health || exit 1

# Command to run the application
ENTRYPOINT ["java", "-jar", "/app/app.jar"] 
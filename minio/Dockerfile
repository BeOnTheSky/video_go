FROM golang:1.25-alpine AS server-builder
ARG GOPROXY=https://goproxy.cn,direct
ENV GOPROXY=${GOPROXY} CGO_ENABLED=0
RUN go install -p 2 github.com/minio/minio@v0.0.0-20260212201848-7aac2a2c5b7c
RUN cp /go/pkg/mod/github.com/minio/minio@v0.0.0-20260212201848-7aac2a2c5b7c/LICENSE /go/bin/LICENSE

FROM golang:1.25-alpine AS client-builder
ARG GOPROXY=https://goproxy.cn,direct
ENV GOPROXY=${GOPROXY} CGO_ENABLED=0
RUN go install -p 2 github.com/minio/mc@v0.0.0-20251106162529-77f82e18b540
RUN cp /go/pkg/mod/github.com/minio/mc@v0.0.0-20251106162529-77f82e18b540/LICENSE /go/bin/LICENSE

FROM alpine:3.19 AS runtime
ARG APK_MIRROR=mirrors.aliyun.com
RUN if [ -n "${APK_MIRROR}" ]; then \
      sed -i "s/dl-cdn.alpinelinux.org/${APK_MIRROR}/g" /etc/apk/repositories; \
    fi \
    && apk add --no-cache ca-certificates curl

FROM runtime AS server
COPY --from=server-builder /go/bin/minio /usr/bin/minio
COPY --from=server-builder /go/bin/LICENSE /licenses/minio-LICENSE
EXPOSE 9000 9001
ENTRYPOINT ["/usr/bin/minio"]

FROM runtime AS client
COPY --from=client-builder /go/bin/mc /usr/bin/mc
COPY --from=client-builder /go/bin/LICENSE /licenses/mc-LICENSE
ENTRYPOINT ["/usr/bin/mc"]

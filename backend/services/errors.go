package services

import "errors"

var (
	ErrBadRequest = errors.New("bad request") // 参数/状态不合法，返回 400
	ErrNotFound   = errors.New("not found")   // 资源不存在，返回 404
	ErrConflict   = errors.New("conflict")    // 唯一键冲突/状态冲突，返回 409
)

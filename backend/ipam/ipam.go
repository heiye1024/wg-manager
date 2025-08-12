package ipam

import (
	"encoding/binary"
	"errors"
	"math/big"
	"net"
)

var ErrNoAvailableIP = errors.New("no available IP in subnet")

func nextIP(ip net.IP) net.IP {
	isV4 := ip.To4() != nil
	i := new(big.Int).SetBytes(ip.To16())
	i.Add(i, big.NewInt(1))
	b := i.Bytes()
	if len(b) < net.IPv6len {
		p := make([]byte, net.IPv6len)
		copy(p[net.IPv6len-len(b):], b)
		b = p
	}
	out := net.IP(b)
	if isV4 {
		return out.To4()
	}
	return out
}

func isReserved(ip net.IP, netw *net.IPNet, serverIP string) bool {
	if !netw.Contains(ip) {
		return true
	}
	if serverIP != "" && ip.Equal(net.ParseIP(serverIP)) {
		return true
	}
	if ip4 := ip.To4(); ip4 != nil {
		network := netw.IP.Mask(netw.Mask)
		if ip.Equal(network) {
			return true
		}
		ones, bits := netw.Mask.Size()
		if bits == 32 && ones < 31 {
			var mask uint32 = binary.BigEndian.Uint32(netw.Mask)
			var netInt uint32 = binary.BigEndian.Uint32(network.To4())
			hostmask := ^mask
			broadcast := netInt | hostmask
			bcast := make(net.IP, 4)
			binary.BigEndian.PutUint32(bcast, broadcast)
			if ip.Equal(bcast) {
				return true
			}
		}
	}
	return false
}

func AllocateNextIP(cidr string, used map[string]struct{}, serverIP string) (string, error) {
	_, netw, err := net.ParseCIDR(cidr)
	if err != nil {
		return "", err
	}
	for ip := nextIP(netw.IP); netw.Contains(ip); ip = nextIP(ip) {
		if isReserved(ip, netw, serverIP) {
			continue
		}
		if _, taken := used[ip.String()]; !taken {
			return ip.String(), nil
		}
	}
	return "", ErrNoAvailableIP
}

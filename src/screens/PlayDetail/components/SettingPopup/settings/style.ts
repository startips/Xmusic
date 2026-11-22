import { createStyle } from '@/utils/tools'

export default createStyle({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
    gap: 1,
  },
  titleText: {
    fontWeight: '600',
  },
  sliderCard: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sliderHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sliderHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valuePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  valueText: {
    fontWeight: '700',
  },
  sliderBleed: {
    marginHorizontal: -6,
  },
  blockCard: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
})

# axis colors

- x - red - #f15d6e
- y - green - #51af35
- z - blue - #009bff
- c - purple - #b771e9

# priority system

1. screen
2. core
3. arrows
4. selection
5. entities
6. blocks

## drag

2. core
3. arrows
4. entities
5. blocks

## click

1. screen
2. selection

# todo

## test

- [ ] delete tool with someone elses selection group

## major bugs

## minor bugs

- [ ] selection creator doesnt have a bounding box
- [ ] kill @e fix
- [ ] player interactable entities priority with other player's interactable entities not organized
- [ ] structure max size causes issue with rotation and fill with large inputs

## implement

- [ ] axis color
- [ ] is viewing / grabbable indicator
- [ ] undo item

## consider

- [ ] nice rotation animation + interactable rotate entities
- [ ] use shearing to make any rotation work
- [ ] make rotations stable using non-rounded bounding boxes
- [ ] auto undo changes in size
- [ ] tp entities with box
- [ ] magic select (smart flood fill)

## too much effort / not worth

- [ ] fix panel 2 axis rotation
- [ ] entity based outline
- [ ] menu for mobile
- [ ] arrows are invisible to people that dont own that box (entities will still obstruct placement)

## done

- [x] cant increase y size at bottom of world
- [x] doesnt release the change type when change = 0
- [x] drag entities
- [x] core offset on pickup
- [x] player can move and resize at the same time
- [x] arrow drag along plane
- [x] move things from behind
- [x] arrow hitboxes
- [x] core hitbox
- [x] perfect rotate undo
- [x] perfect flip undo
- [x] add distance to player limit
- [x] bad screen spawn location
- [x] back panel
- [x] prioritize center core over arrows
- [x] undo size change
- [x] deselect broke
- [x] ownership system
- [x] bottom fix
- [x] owner color
